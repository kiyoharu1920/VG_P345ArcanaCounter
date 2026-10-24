import assert from "node:assert/strict";
import { test } from "node:test";
import { arcanaFor, createState, parseState } from "./arcana.ts";

test("シリーズ固有のアルカナと一意な識別子", () => {
  for (const [series, length] of [["p3", 22], ["p4", 23], ["p5", 24]]) {
    const cards = arcanaFor(series);
    assert.equal(cards.length, length);
    assert.equal(new Set(cards.map(({ id }) => id)).size, length);
  }
  assert.ok(arcanaFor("p3").some(({ id }) => id === "aeon"));
  assert.ok(!arcanaFor("p3").some(({ id }) => id === "jester"));
  assert.ok(arcanaFor("p4").some(({ id }) => id === "jester"));
  assert.ok(!arcanaFor("p5").some(({ id }) => id === "aeon"));
  assert.ok(arcanaFor("p5").some(({ id }) => id === "faith"));
});
test("シリーズ別のカウント・非表示・選択状態を復元", () => {
  const state = createState();
  state.series = "p4";
  state.decks.p3.counts.fool = 3;
  state.decks.p4.counts.fool = 1;
  state.decks.p4.hidden = ["fool", "aeon"];
  assert.deepEqual(parseState(JSON.stringify(state)), state);
});
test("保存値の型・範囲・未知キーを検証", () => {
  const state = parseState(JSON.stringify({ series: "p6", decks: { p3: { counts: { fool: 4, magician: -1, priestess: 1.5, empress: "3", emperor: 3, invalid: 1 }, hidden: ["fool", "invalid", "fool", 4] }, p4: null } }));
  assert.equal(state.series, "p3");
  assert.deepEqual(state.decks.p3, { counts: { emperor: 3 }, hidden: ["fool"] });
  assert.deepEqual(state.decks.p4, { counts: {}, hidden: [] });
  for (const value of ["broken", "null", "[]", "3"]) assert.throws(() => parseState(value));
});
