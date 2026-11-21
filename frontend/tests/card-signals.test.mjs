import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { combineDirections, balanceRange, getCardSignals } from "../src/lib/card-signals.ts";

const deck = JSON.parse(await readFile(new URL("../../shared/deck-design.json", import.meta.url), "utf8"));
const card = (id) => ({ id, design: deck.cards.find((item) => item.id === id) });

test("every designed card has a sourced comparison and derived balance", () => {
  assert.equal(deck.cards.length, 30);
  for (const item of deck.cards) {
    const result = getCardSignals(card(item.id));
    assert.ok(result?.comparison && result?.period && result?.later && result?.ruleIds.length);
    assert.equal(result.happiness.direction, combineDirections(result.money.direction, result.time.direction));
  }
});
test("uncertain income cannot silently become certain happiness", () => {
  for (const time of ["up", "same", "down", "depends"]) assert.equal(combineDirections("depends", time), "depends");
  assert.deepEqual(balanceRange("depends", "up"), [0, 1]);
  assert.deepEqual(balanceRange("depends", "down"), [-1, 0]);
});
test("equal opposite tradeoffs cancel; the balance is symmetric and monotone", () => {
  assert.equal(combineDirections("up", "down"), "same");
  assert.equal(combineDirections("same", "same"), "same");
  assert.equal(combineDirections("up", "same"), "up");
  assert.equal(combineDirections("down", "same"), "down");
  for (const money of ["down", "same", "up", "depends"]) {
    let previous = -Infinity;
    for (const time of ["down", "same", "up"]) {
      const range = balanceRange(money, time);
      assert.deepEqual(range, balanceRange(time, money));
      assert.ok(range[0] >= previous && range[0] <= range[1]);
      previous = range[0];
    }
  }
});
test("deferral and part-time do not invent present free time", () => {
  for (const id of ["1A", "2B", "2C", "4C", "4D", "5C"]) {
    const result = getCardSignals(card(id));
    assert.equal(result.time.direction, "down", id);
    assert.equal(result.money.direction, "depends", id);
  }
});
test("paperwork/reservations do not create income, leave or happiness", () => {
  for (const id of ["1F", "3D", "3E"]) {
    const result = getCardSignals(card(id));
    assert.equal(result.money.direction, "same");
    assert.equal(result.time.direction, "same");
    assert.equal(result.happiness.direction, "same");
  }
  assert.equal(getCardSignals({ id: "2C" }), undefined);
});
