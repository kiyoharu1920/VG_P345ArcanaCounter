export const seriesList = [
  { id: "p3", name: "P3", subtitle: "PERSONA 3" },
  { id: "p4", name: "P4", subtitle: "PERSONA 4" },
  { id: "p5", name: "P5", subtitle: "PERSONA 5" },
] as const;
export type Series = (typeof seriesList)[number]["id"];

const common = [
  ["fool", "0", "愚者", "THE FOOL"],
  ["magician", "I", "魔術師", "THE MAGICIAN"],
  ["priestess", "II", "女教皇", "THE HIGH PRIESTESS"],
  ["empress", "III", "女帝", "THE EMPRESS"],
  ["emperor", "IV", "皇帝", "THE EMPEROR"],
  ["hierophant", "V", "法王", "THE HIEROPHANT"],
  ["lovers", "VI", "恋愛", "THE LOVERS"],
  ["chariot", "VII", "戦車", "THE CHARIOT"],
  ["justice", "VIII", "正義", "JUSTICE"],
  ["hermit", "IX", "隠者", "THE HERMIT"],
  ["fortune", "X", "運命", "WHEEL OF FORTUNE"],
  ["strength", "XI", "剛毅", "STRENGTH"],
  ["hanged", "XII", "刑死者", "THE HANGED MAN"],
  ["death", "XIII", "死神", "DEATH"],
  ["temperance", "XIV", "節制", "TEMPERANCE"],
  ["devil", "XV", "悪魔", "THE DEVIL"],
  ["tower", "XVI", "塔", "THE TOWER"],
  ["star", "XVII", "星", "THE STAR"],
  ["moon", "XVIII", "月", "THE MOON"],
  ["sun", "XIX", "太陽", "THE SUN"],
  ["judgement", "XX", "審判", "JUDGEMENT"],
] as const;
const aeon = ["aeon", "XX", "永劫", "AEON"] as const;
// 公式 DZ-TBP02/AR01–AR47 のマーカー名を使用。
// https://cf-vanguard.com/cardlist/cardsearch/?keyword=DZ-TBP02
export function arcanaFor(series: Series) {
  const extra = series === "p3" ? [aeon] : series === "p4" ? [aeon, ["jester", "0", "道化師", "THE JESTER"] as const] : [
    ["world", "XXI", "世界", "THE WORLD"] as const,
    ["faith", "—", "信念", "FAITH"] as const,
    ["councillor", "I", "顧問官", "THE COUNCILLOR"] as const,
  ];
  return [...common, ...extra].map(([id, numeral, name, english]) => ({ id, numeral, name, english }));
}

export type Deck = { counts: Record<string, number>; hidden: string[] };
export type CounterState = { series: Series; decks: Record<Series, Deck> };
export const storageKey = "vg-persona-arcana:v1";
export function createState(): CounterState {
  return { series: "p3", decks: { p3: { counts: {}, hidden: [] }, p4: { counts: {}, hidden: [] }, p5: { counts: {}, hidden: [] } } };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseState(raw: string): CounterState {
  const value: unknown = JSON.parse(raw);
  const result = createState();
  if (!isRecord(value)) throw new Error("保存データの形式が不正です");
  if (value.series === "p3" || value.series === "p4" || value.series === "p5") result.series = value.series;
  if (!isRecord(value.decks)) return result;
  for (const { id: series } of seriesList) {
    const deck = value.decks[series];
    if (!isRecord(deck)) continue;
    for (const { id } of arcanaFor(series)) {
      const count = isRecord(deck.counts) ? deck.counts[id] : undefined;
      if (typeof count === "number" && Number.isInteger(count) && count >= 0 && count <= 3) result.decks[series].counts[id] = count;
      if (Array.isArray(deck.hidden) && deck.hidden.includes(id)) result.decks[series].hidden.push(id);
    }
  }
  return result;
}
