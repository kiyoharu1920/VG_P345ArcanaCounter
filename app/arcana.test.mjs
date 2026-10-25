import assert from "node:assert/strict";
import { test } from "node:test";
import { arcanaFor, createState, nextEnergy, parseState } from "./arcana.ts";

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
  assert.deepEqual(state.decks.p3, { energy: 0, opponentEnergy: 0, counts: { emperor: 3 }, hidden: ["fool"] });
  assert.deepEqual(state.decks.p4, { energy: 0, opponentEnergy: 0, counts: {}, hidden: [] });
  for (const value of ["broken", "null", "[]", "3"]) assert.throws(() => parseState(value));
});

test("対戦相手の独立した残量・表示設定の保存と旧形式の互換性", () => {
  const state = createState();
  state.showOpponent = false;
  state.decks.p3.energy = 3;
  state.decks.p3.opponentEnergy = 10;
  state.decks.p4.opponentEnergy = 7;
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  const { showOpponent, ...legacy } = state;
  assert.equal(showOpponent, false);
  for (const deck of Object.values(legacy.decks)) delete deck.opponentEnergy;
  const restored = parseState(JSON.stringify(legacy));
  assert.equal(restored.showOpponent, true);
  assert.equal(restored.decks.p3.energy, 3);
  assert.equal(restored.decks.p3.opponentEnergy, 0);
  for (const energy of [-1, 11, 1.5, "3", null]) {
    const parsed = parseState(JSON.stringify({ showOpponent: "false", decks: { p3: { opponentEnergy: energy } } }));
    assert.equal(parsed.decks.p3.opponentEnergy, 0);
    assert.equal(parsed.showOpponent, true);
  }
});

test("P5の全アルカナにフランス語のルビがあり、P3/P4は英語のまま", () => {
  const cards = arcanaFor("p5");
  assert.equal(cards.find(({ id }) => id === "magician").caption, "LE BATELEUR");
  assert.equal(cards.find(({ id }) => id === "councillor").caption, "LE CONSULTANT");
  for (const card of cards) {
    assert.equal(card.language, "fr");
    assert.ok(card.caption.trim().length > 0);
    assert.notEqual(card.caption, arcanaFor("p4").find(({ id }) => id === card.id)?.caption);
  }
  for (const series of ["p3", "p4"]) {
    assert.equal(arcanaFor(series).find(({ id }) => id === "magician").caption, "THE MAGICIAN");
    assert.ok(arcanaFor(series).every(({ language }) => language === "en"));
  }
});
test("表示モードの保存・検証と旧形式の保存データとの互換性", () => {
  const state = createState();
  state.mode = "light";
  state.decks.p5.counts.magician = 3;
  state.decks.p5.hidden = ["fool"];
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  const { mode, ...legacy } = state;
  assert.equal(mode, "light");
  assert.deepEqual(parseState(JSON.stringify(legacy)), { ...state, mode: "dark" });
  assert.deepEqual(parseState(JSON.stringify({ ...state, mode: "invalid" })), { ...state, mode: "dark" });
});

test("エネルギーの増減・上限と不足時のブラスト防止", () => {
  assert.equal(nextEnergy(0, 3), 3);
  assert.equal(nextEnergy(8, 3), 10);
  assert.equal(nextEnergy(10, 1), 10);
  assert.equal(nextEnergy(10, -7), 3);
  assert.equal(nextEnergy(7, -7), 0);
  assert.equal(nextEnergy(6, -7), 6);
  assert.equal(nextEnergy(0, -1), 0);
  assert.equal(nextEnergy(3, 1), 4);
  assert.equal(nextEnergy(3, -1), 2);
  assert.equal(nextEnergy(8, -8), 0);
});

test("シリーズ別エネルギーの保存・旧データ互換性・不正値の除外", () => {
  const state = createState();
  state.decks.p3.energy = 10;
  state.decks.p4.energy = 3;
  state.decks.p5.energy = 7;
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  const legacy = createState();
  for (const deck of Object.values(legacy.decks)) delete deck.energy;
  legacy.decks.p3.counts.fool = 2;
  legacy.decks.p3.hidden = ["magician"];
  const restored = parseState(JSON.stringify(legacy));
  assert.equal(restored.decks.p3.energy, 0);
  assert.deepEqual(restored.decks.p3.counts, { fool: 2 });
  assert.deepEqual(restored.decks.p3.hidden, ["magician"]);
  for (const energy of [-1, 11, 1.5, "3", null]) {
    assert.equal(parseState(JSON.stringify({ decks: { p3: { energy } } })).decks.p3.energy, 0);
  }
});
