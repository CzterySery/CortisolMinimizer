import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getCardSignals } from "../src/lib/card-signals.ts";
import { gameProfiles, gameScores } from "../src/lib/game-result.ts";
import { ensurePlayable } from "../src/lib/deal.ts";

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
