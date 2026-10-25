"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { arcanaFor, createState, nextEnergy, parseState, seriesList, storageKey, type CounterState, type Series } from "./arcana";

export default function Home() {
  const [state, setState] = useState<CounterState>(createState);
  const [ready, setReady] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [editing, setEditing] = useState(false);
  const resetDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // ブラウザの保存データとの初回同期。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved !== null) setState(parseState(saved));
    } catch {
      setCanSave(false);
      setStorageError("保存データを読み込めません。元データを保護するため自動保存を停止しています。この画面での変更は保存されません。");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !canSave) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageError("");
    } catch {
      setStorageError("端末に保存できません。ページを閉じると変更が失われます。");
    }
  }, [ready, canSave, state]);

  const series = state.series;
  const deck = state.decks[series];
  const arcana = arcanaFor(series);
  const visible = arcana.filter(({ id }) => !deck.hidden.includes(id));
  const total = arcana.reduce((sum, { id }) => sum + (deck.counts[id] ?? 0), 0);
  const complete = arcana.filter(({ id }) => deck.counts[id] === 3).length;

  function changeCount(id: string, delta: number) {
    setState((previous) => {
      const current = previous.decks[series];
      const count = Math.max(0, Math.min(3, (current.counts[id] ?? 0) + delta));
      return { ...previous, decks: { ...previous.decks, [series]: { ...current, counts: { ...current.counts, [id]: count } } } };
    });
  }

  function toggleVisibility(id: string) {
    setState((previous) => {
      const current = previous.decks[series];
      const hidden = current.hidden.includes(id) ? current.hidden.filter((value) => value !== id) : [...current.hidden, id];
      return { ...previous, decks: { ...previous.decks, [series]: { ...current, hidden } } };
    });
  }

  function changeEnergy(key: "energy" | "opponentEnergy", energy: number) {
    setState((previous) => {
      const current = previous.decks[series];
      return { ...previous, decks: { ...previous.decks, [series]: { ...current, [key]: energy } } };
    });
  }

  function selectEnergyAtPointer(event: PointerEvent<HTMLDivElement>, key: "energy" | "opponentEnergy") {
    let distance = Infinity;
    let energy = 0;
    for (const marker of event.currentTarget.querySelectorAll<HTMLButtonElement>("button")) {
      const rect = marker.getBoundingClientRect();
      const nextDistance = Math.abs(event.clientX - (rect.left + rect.width / 2));
      if (nextDistance < distance) {
        distance = nextDistance;
        energy = Number(marker.value);
      }
    }
    changeEnergy(key, energy);
  }

  function selectSeries(value: Series) {
    setState((previous) => ({ ...previous, series: value }));
    setEditing(false);
  }

  return (
    <main className={`counter theme-${series} mode-${state.mode}`}>
      <h1 className="sr-only">アルカナカウンター</h1>
      <div className="mode-switch" role="group" aria-label="表示モード">
        {(["light", "dark"] as const).map((mode) => <button key={mode} aria-pressed={state.mode === mode} disabled={!ready} onClick={() => setState((previous) => ({ ...previous, mode }))}>{mode === "light" ? "☀ ライト" : "☾ ダーク"}</button>)}
      </div>
      <section className="energy-area" aria-label="エネルギーカウンター">
        <div className="energy-visibility"><button className="secondary-button" aria-expanded={state.showOpponent} aria-controls={state.showOpponent ? "opponent-energy" : undefined} disabled={!ready} onClick={() => setState((previous) => ({ ...previous, showOpponent: !previous.showOpponent }))}>{state.showOpponent ? "対戦相手を非表示" : "対戦相手を表示"}</button></div>
        {(["opponentEnergy", "energy"] as const).map((key) => {
          if (key === "opponentEnergy" && !state.showOpponent) return null;
          const opponent = key === "opponentEnergy";
          const label = opponent ? "対戦相手" : "自分";
          const energy = deck[key];
          return <section key={key} id={opponent ? "opponent-energy" : undefined} className={`dashboard energy-counter${opponent ? " opponent-energy" : ""}`} aria-label={`${label}のエネルギー`}>
            <div className="energy-heading"><div><h2>{label}のエネルギー</h2><p>エネルギージェネレーター · 上限10</p></div><button className="reset-button" aria-label={`${label}のエネルギーを0にリセット`} disabled={!ready || energy === 0} onClick={() => changeEnergy(key, 0)}>↺ リセット</button></div>
            <output className="sr-only" aria-label={`${label}のエネルギーの数`} aria-live="polite">{energy}</output>
            <div className="energy-markers" role="group" aria-label={`${label}のエネルギーを選択`}
              onPointerDown={(event) => {
                if (!ready || !event.isPrimary || event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                selectEnergyAtPointer(event, key);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) selectEnergyAtPointer(event, key);
              }}>
              {Array.from({ length: 10 }, (_, index) => <button key={index} value={index + 1} disabled={!ready} className={index < energy ? "filled" : ""} aria-label={`${label}のエネルギーを${index + 1}に設定`} aria-pressed={energy === index + 1} onClick={() => changeEnergy(key, index + 1)}>{index + 1}</button>)}
            </div>
            <div className="energy-actions"><button className="secondary-button energy-step" aria-label={`${label}のエネルギーを1減らす`} disabled={!ready || energy === 0} onClick={() => changeEnergy(key, nextEnergy(energy, -1))}>−</button><button className="secondary-button" disabled={!ready || energy < 7} onClick={() => changeEnergy(key, nextEnergy(energy, -7))}>ブラスト −7</button><button className="secondary-button" disabled={!ready || energy === 10} onClick={() => changeEnergy(key, nextEnergy(energy, 3))}>チャージ ＋3</button><button className="secondary-button energy-step" aria-label={`${label}のエネルギーを1増やす`} disabled={!ready || energy === 10} onClick={() => changeEnergy(key, nextEnergy(energy, 1))}>＋</button></div>
          </section>;
        })}
      </section>
      <nav className="series-tabs" aria-label="ペルソナシリーズ">
        {seriesList.map(({ id, name, subtitle }) => <button key={id} className={`series-tab tab-${id}`} aria-pressed={series === id} onClick={() => selectSeries(id)} disabled={!ready}><span className="tab-title">{name}<span className="tab-dot" /></span><span className="tab-subtitle">{subtitle}</span></button>)}
      </nav>
      <section className="dashboard" aria-label="カウンター概要">
        <div className="dashboard-title"><span className="live-dot" />{series.toUpperCase()} <span>DECK STATUS</span></div>
        <div className="stats"><div><strong>{total.toString().padStart(2, "0")}</strong><span>全アルカナ合計</span></div><div><strong>{complete.toString().padStart(2, "0")}</strong><span>3枚そろった種類</span></div><div><strong>{visible.length}<small> / {arcana.length}</small></strong><span>表示中の種類</span></div></div>
      </section>
      <div className="toolbar"><div><h2>アルカナ一覧</h2><span className="count-hint">各アルカナ 0–3</span></div><div className="toolbar-actions"><button className="secondary-button" aria-expanded={editing} aria-controls={editing ? "visibility-settings" : undefined} onClick={() => setEditing(!editing)} disabled={!ready}>{editing ? "✓ 設定を閉じる" : "⚙ 表示設定"}</button><button className="reset-button" onClick={() => resetDialog.current?.showModal()} disabled={!ready || total === 0}>↺ リセット</button></div></div>
      {storageError && <p className="notice" role="status">{storageError}</p>}
      {!ready && <p role="status">保存データを読み込み中…</p>}
      {editing && <section className="visibility-settings" id="visibility-settings" aria-label="アルカナ表示設定"><div className="settings-heading"><div><h3>デッキに使うアルカナを選択</h3><p>非表示にしてもカウントは保持されます。</p></div><button className="secondary-button" onClick={() => setState((previous) => ({ ...previous, decks: { ...previous.decks, [series]: { ...previous.decks[series], hidden: [] } } }))}>すべて表示</button></div><div className="visibility-options">{arcana.map(({ id, name, numeral }) => <label key={id}><input type="checkbox" checked={!deck.hidden.includes(id)} onChange={() => toggleVisibility(id)} /><span className="option-numeral">{numeral}</span>{name}</label>)}</div></section>}
      <section className="arcana-grid" aria-label={`${series.toUpperCase()}のアルカナ`} aria-busy={!ready}>
        {visible.map(({ id, name, numeral, caption, language }) => {
          const count = deck.counts[id] ?? 0;
          return <article key={id} className={`arcana-card ${count === 3 ? "is-complete" : ""}`} aria-label={name}>
            <h3 className="arcana-label"><span className="arcana-prefix">ARCANA :</span><ruby><span>{numeral} {name}</span><rp>（</rp><rt lang={language}>{caption}</rt><rp>）</rp></ruby></h3>
            <div className="count-controls"><button aria-label={`${name}を1減らす`} disabled={!ready || count === 0} onClick={() => changeCount(id, -1)}>−</button><output aria-label={`${name}の枚数`} aria-live="polite">{count}</output><button className="plus-button" aria-label={`${name}を1増やす`} disabled={!ready || count === 3} onClick={() => changeCount(id, 1)}>＋</button></div>
            <div className="count-segments" aria-hidden="true">{[1, 2, 3].map((step) => <span key={step} className={count >= step ? "filled" : ""} />)}</div>
          </article>;
        })}
      </section>
      {visible.length === 0 && <div className="empty-state"><span aria-hidden="true">◇</span><h3>表示するアルカナがありません</h3><p>「表示設定」から、使用するアルカナを選んでください。</p><button className="secondary-button" onClick={() => setEditing(true)}>表示設定を開く</button></div>}
      <footer><span>✦ ARCANA COUNTER</span><p>カウント・表示設定はこのブラウザに自動保存</p><small>ファンメイドの非公式ツールです。</small></footer>
      <dialog ref={resetDialog} className="reset-dialog" aria-labelledby="reset-title" aria-describedby="reset-description"><form method="dialog"><span className="eyebrow">NEW FIGHT</span><h2 id="reset-title">{series.toUpperCase()}のカウントをリセット？</h2><p id="reset-description">非表示のアルカナを含め、すべて0に戻します。<br />表示設定と他のシリーズのカウントは残ります。</p><div className="dialog-actions"><button className="secondary-button" autoFocus>キャンセル</button><button className="confirm-button" onClick={() => setState((previous) => ({ ...previous, decks: { ...previous.decks, [series]: { ...previous.decks[series], counts: {} } } }))}>0にリセット</button></div></form></dialog>
    </main>
  );
}
