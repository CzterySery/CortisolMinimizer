import assert from "node:assert/strict";
import test from "node:test";
import { documentKey, matchesReceipt } from "../src/lib/document-identity.ts";

const doc = { form: "Wniosek o urlop rodzicielski", who: "mother", recipient: "employer", start: "2027-07-19", end: "2027-08-01" };

test("a receipt matches only its parent, recipient and complete period", () => {
  assert.equal(matchesReceipt(doc, { ...doc }), true);
  for (const patch of [{ start: "2027-08-02" }, { end: "2027-08-02" }, { who: "father" }, { recipient: "zus" },
    { start: undefined, end: undefined }, { form: "ZAM" }]) assert.equal(matchesReceipt(doc, { ...doc, ...patch }), false);
  assert.equal(documentKey(doc), JSON.stringify([doc.form, doc.who, doc.recipient, doc.start, doc.end]));
});
