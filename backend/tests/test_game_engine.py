"""Cross-round resource accounting; pure, no DB. Scenario values are explicit sample inputs."""
from collections import Counter

import pytest

from app.game.engine import simulate
from app.params import Params
from app.repositories import DATA, get_designed_cards, get_game_scenarios

P = Params.model_validate_json((DATA / "params.json").read_text())
DATASET = get_game_scenarios()
CARDS = get_designed_cards()


def run(*selected, scenario="standard"):
    return simulate(scenario, list(selected), P, DATASET, CARDS)


def candidate(state, card_id):
    return next(card for card in state.candidates if card.id == card_id)


def test_prebirth_is_same_pool_and_less_after_birth():
    normal, early = run("1A"), run("1B")
    a, b = normal.plan.blocks[0], early.plan.blocks[0]
    assert a.days == b.days == P.maternity.weeks_by_children[0] * 7
    assert (a.start - b.start).days == DATASET["choices"]["prebirth_days"]
    assert normal.result.pools.maternity_days_left == early.result.pools.maternity_days_left == 0
    assert len(normal.result.months) == len(early.result.months)


def test_paternity_is_not_recreated_in_later_round():
    exhausted = run("1A", "2A", "3A")
    assert exhausted.result.pools.paternity_days_left == 0
    assert not candidate(exhausted, "4E").available
    split = run("1A", "2B", "3A", "4E")
    assert split.result.pools.paternity_days_left == 0
    assert sum(b.days for b in split.plan.blocks if b.kind == "paternity") == P.paternity.days
    assert split.reservations["paternity"] == 0


def test_reservation_does_not_pay_or_use_days_until_consumed():
    baseline, reserved = run("1A"), run("1A", "2C")
    assert baseline.result.months == reserved.result.months
    assert reserved.result.pools.paternity_days_left == P.paternity.days
    before = run("1A", "2C", "3A", "4D")
    after = run("1A", "2C", "3A", "4D", "5A")
    amount = DATASET["choices"]["adaptation_days"]
    assert before.result.pools.parental_days_left - after.result.pools.parental_days_left == amount
    assert before.reservations["parental"] - after.reservations["parental"] == amount


def test_consuming_parental_pool_blocks_later_leave():
    state = run("1A", "2C", "3A", "4A")
    assert state.result.pools.parental_days_left == 0
    for card in ("5A", "5B", "5C"):
        assert not candidate(state, card).available
    assert candidate(state, "5D").available  # separate annual care pool
    with pytest.raises(ValueError):
        run("1A", "2C", "3A", "4A", "5A")


def test_part_time_consumes_pool_once_for_extended_calendar():
    state = run("1A", "2C", "3A", "4C")
    block = next(b for b in state.plan.blocks if b.kind == "parental")
    amount = DATASET["choices"]["parental_pool_days"]
    assert block.days * (1 - block.work_fraction) == amount
    assert state.result.pools.parental_days_left == P.parental.weeks_single * 7 - amount


def test_educational_cards_are_playable_without_special_facts():
    assert candidate(run(), "1D").available
    for card_id in ["1C", "1F"]:
        assert candidate(run(), card_id).available
    for card_id in ["2D", "2E", "2F"]:
        assert candidate(run("1A"), card_id).available
    for card_id in ["3E", "3F"]:
        assert candidate(run("1A", "2C"), card_id).available


def test_medical_fact_is_preserved_when_playing_an_educational_card():
    baseline = run(scenario="hospital")
    kept = run("1A", scenario="hospital")
    documented = run("1C", scenario="hospital")
    for state in (baseline, kept, documented):
        sick = [b for b in state.plan.blocks if b.kind == "sick"]
        assert len(sick) == 1 and sick[0].days == DATASET["choices"]["sick_days"]
    assert not candidate(baseline, "1B").available  # cannot erase overlapping e-ZLA


def test_paperwork_does_not_create_money_or_time():
    before, after = run(), run("1E")
    assert before.result.months == after.result.months
    assert before.result.pools == after.result.pools
    assert before.statistics[:2] == after.statistics[:2]
    assert before.statistics[2].value == 50
    assert after.statistics[2].value == 58


@pytest.mark.parametrize("scenario", ["standard", "hospital", "za-zyciem"])
def test_complete_plan_valid_and_knowledge_only_increases_on_education(scenario):
    state = run("1C" if scenario == "hospital" else "1B", "2B", "3B", "4D", "5F", scenario=scenario)
    assert not [issue for issue in state.result.issues if issue.severity == "error"]
    knowledge = state.statistics[2]
    assert knowledge.value == 50 + (8 if scenario == "hospital" else 0)
    assert candidate(run("1A"), "2D").statistics[2].value == 58
    assert candidate(run("1A"), "2A").statistics[2].value == 50
    assert state.result.pools.care_days_left == P.care.days_per_year_child_under_14 - DATASET["choices"]["emergency_days"]


def test_rounds_cannot_be_skipped_or_duplicated():
    for selected in [("2A",), ("1A", "1B"), ("missing",)]:
        with pytest.raises(ValueError):
            run(*selected)


GATED: set[str] = set()


def test_every_hand_is_playable_and_every_card_completes_a_legal_plan():
    """Three walks per scenario, each round playing the least-played available card. simulate() replays the
    whole plan and raises on any legal error, so reaching round 5 proves the plan is legal. A one-off exhaustive
    search of all ~4 350 paths (~100 s) found no round without a playable card and identified the previously gated cards."""
    played = Counter()
    for scenario in DATASET["scenarios"]:
        for _ in range(3):
            selected = []
            while len(selected) < 5:
                playable = [c.id for c in run(*selected, scenario=scenario).candidates if c.available]
                assert playable, (scenario, selected)
                pick = min(playable, key=lambda card_id: (played[card_id], card_id))
                played[pick] += 1
                selected.append(pick)
            run(*selected, scenario=scenario)
    assert {card["id"] for card in CARDS} - set(played) == GATED
