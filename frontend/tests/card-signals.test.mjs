import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getCardSignals } from "../src/lib/card-signals.ts";
import { gameProfiles, gameScores } from "../src/lib/game-result.ts";
import { ensurePlayable } from "../src/lib/deal.ts";
import { getDecisionTreeRound, buildCalculatorHandoffPlan } from "../src/lib/decision-tree.ts";

test("an exhausted parental pool cannot leave a new or restored hand unplayable", () => {
  const pool = ["5A", "5B", "5C", "5D", "5E", "5F"].map((id) => ({ id }));
  const available = new Set(["5D", "5E", "5F"]);
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 5; b++) for (let c = b + 1; c < 6; c++) {
    const hand = [pool[a], pool[b], pool[c]];
    const dealt = ensurePlayable(hand, pool, available);
    assert.equal(dealt.length, 3);
    assert.equal(new Set(dealt.map((card) => card.id)).size, 3);
    assert.ok(dealt.some((card) => available.has(card.id)));
    if (hand.some((card) => available.has(card.id))) assert.equal(dealt, hand);
  }
  assert.deepEqual(ensurePlayable([], pool, available), []);
});

const deck = JSON.parse(await readFile(new URL("../../shared/deck-design.json", import.meta.url), "utf8"));
const legal = JSON.parse(await readFile(new URL("../../shared/legal-rules.json", import.meta.url), "utf8"));
const card = (id) => ({ id, design: deck.cards.find((item) => item.id === id) });

test("all 30 visual profiles have explanations and existing legal source references", () => {
  assert.equal(deck.cards.length, 30);
  for (const item of deck.cards) {
    const result = getCardSignals(card(item.id));
    assert.ok(result?.comparison && result?.period && result?.later && result?.ruleIds.length);
    assert.ok(result.moneyReason && result.timeReason && result.knowledgeReason);
    for (const id of result.ruleIds) assert.ok(legal.rules.some((rule) => rule.id === id), `${item.id}: ${id}`);
    for (const id of ["money", "time", "knowledge"]) {
      assert.ok(Number.isFinite(result[id].emphasis));
      assert.equal(/\d/.test(result[id].label), false);
    }
  }
});
test("reservations give no payout; work reduces time; leave adds time and support", () => {
  for (const id of ["2C", "4D"]) {
    const result = getCardSignals(card(id));
    assert.equal(result.time.direction, "down", id);
    assert.equal(result.money.direction, "same", id);
  }
  for (const id of ["4C", "5C"]) assert.equal(getCardSignals(card(id)).time.direction, "down");
  for (const id of ["1A", "1B", "2A", "2B", "3C", "4A", "4B", "4E", "4F", "5A", "5B", "5D", "5E", "5F"]) {
    assert.equal(getCardSignals(card(id)).time.direction, "up", id);
    assert.equal(getCardSignals(card(id)).money.direction, "up", id);
  }
  assert.ok(getCardSignals(card("2B")).time.emphasis < getCardSignals(card("2A")).time.emphasis);
});
test("learning and paperwork add knowledge at a small time cost without granting money", () => {
  for (const id of ["1C", "1D", "1E", "1F", "2D", "2E", "2F", "3D", "3E", "3F"]) {
    const result = getCardSignals(card(id));
    assert.equal(result.knowledge.direction, "up", id);
    assert.equal(result.money.direction, "same", id);
    assert.equal(result.time.direction, "down", id);
    assert.ok(Math.abs(result.time.emphasis) < result.knowledge.emphasis);
  }
  for (const id of ["1A", "1B", "2A", "2B", "4A", "5F"]) assert.equal(getCardSignals(card(id)).knowledge.direction, "same", id);
  for (const id of ["2C", "3B", "4D"]) assert.equal(getCardSignals(card(id)).knowledge.direction, "up", id);
  assert.equal(getCardSignals({ id: "2C" }), undefined);
});

const signals = (...ids) => ids.map((id) => getCardSignals(card(id)));
test("final profiles follow visual card themes with ties", () => {
  assert.deepEqual(gameProfiles(signals("1A", "2A", "3C", "4A", "5A")).map((p) => p.id), ["time"]);
  assert.deepEqual(gameProfiles(signals("1A", "2B", "3A", "4C", "5C")).map((p) => p.id), ["money"]);
  assert.deepEqual(gameProfiles(signals("1C", "2D", "3D", "4D", "5B")).map((p) => p.id), ["knowledge"]);
  assert.deepEqual(gameProfiles(signals("2B")).map((p) => p.id), ["time", "money"]);
});
test("hover previews accumulate on the played balance without committing or using API numbers", () => {
  const played = signals("1A", "2A");
  const before = gameScores(played);
  const preview = gameScores([...played, ...signals("3D")]);
  assert.equal(before.money, preview.money);
  assert.ok(preview.time < before.time);
  assert.ok(preview.knowledge > before.knowledge);
  assert.deepEqual(gameScores(played), before);
  assert.deepEqual(gameScores([]), { money: 50, time: 50, knowledge: 50 });
});

test("decision tree produces 3 mutually exclusive choices per round and branches by situation and parental pool", () => {
  const stages = [1, 2, 3, 4, 5].map((id) => ({
    id,
    title: `Runda ${id}`,
    description: "",
    cards: deck.cards.filter((c) => c.round_id === id).map((d) => ({
      id: d.id, round_id: d.round_id, title: d.title, description: d.description,
      tags: d.tags, requires: [], effects: [], chips: 0, combos: [], sources: [], design: d,
    })),
  }));

  const r1 = getDecisionTreeRound(0, [], stages);
  assert.equal(r1.cards.length, 3);
  assert.deepEqual(r1.activeNodes.map((n) => n.branchTag), ["birth", "adoption", "foster"]);

  const r2Birth = getDecisionTreeRound(1, ["1A"], stages);
  const r2Adoption = getDecisionTreeRound(1, ["1B"], stages);
  const r2Foster = getDecisionTreeRound(1, ["1D"], stages);
  assert.equal(r2Birth.cards.length, 3);
  assert.equal(r2Adoption.cards.length, 3);
  assert.equal(r2Foster.cards.length, 3);
  assert.notEqual(r2Birth.cards[0].title, r2Adoption.cards[0].title);
  assert.notEqual(r2Adoption.cards[0].title, r2Foster.cards[0].title);

  const r5WithReserve = getDecisionTreeRound(4, ["1A", "2C", "3B", "4D"], stages);
  const r5Exhausted = getDecisionTreeRound(4, ["1A", "2C", "3B", "4A"], stages);
  assert.equal(r5WithReserve.cards.length, 3);
  assert.equal(r5Exhausted.cards.length, 3);
  assert.deepEqual(r5Exhausted.cards.map((c) => c.id), ["5D", "5E", "5F"]);

  // Rounds 3 and 4 also adapt by situation (foster vs adoption vs birth) and tag strategies
  const r3Birth = getDecisionTreeRound(2, ["1A", "2A"], stages);
  const r3Foster = getDecisionTreeRound(2, ["1D", "2B"], stages);
  assert.notEqual(r3Birth.cards[0].title, r3Foster.cards[0].title);
  assert.deepEqual(r3Foster.activeNodes.map((n) => n.strategyId), ["kortyzol", "zasilki", "aura"]);

  const r4Birth = getDecisionTreeRound(3, ["1A", "2A", "3B"], stages);
  const r4Foster = getDecisionTreeRound(3, ["1D", "2B", "3B"], stages);
  assert.notEqual(r4Birth.cards[0].title, r4Foster.cards[0].title);

  // Handoff plan transfers situation, school deferral, za_zyciem and rate_variant
  const basePlan = {
    family: {
      mother: { employment: "employee", base_monthly: "6000" },
      father: { employment: "employee", base_monthly: "8000" },
      due_date: "2027-03-01",
      birth_date: null,
      children: 1,
    },
    blocks: [],
    rate_variant: "standard",
  };
  const fosterPlan = buildCalculatorHandoffPlan(basePlan, ["1D", "2B", "3B", "4D", "5A"]);
  assert.equal(fosterPlan.family.adoption?.kind, "foster");
  assert.equal(fosterPlan.family.adoption?.school_deferred, true);
  assert.equal(fosterPlan.rate_variant, "averaged");
  assert.equal(fosterPlan.averaged_request_on, "2027-03-01");
});
