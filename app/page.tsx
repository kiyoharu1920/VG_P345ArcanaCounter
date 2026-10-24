"use client";

import { useEffect, useRef, useState } from "react";
import { arcanaFor, createState, parseState, seriesList, storageKey, type CounterState, type Series } from "./arcana";

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

  function selectSeries(value: Series) {
    setState((previous) => ({ ...previous, series: value }));
    setEditing(false);
  }

  return (
    <main className={`counter theme-${series}`}>
      <header className="masthead">
        <div className="brand"><span className="brand-mark" aria-hidden="true">✦</span><span>ARCANA<span className="brand-sub">COUNTER</span></span></div>
        <span className="game-label">VANGUARD<br /><strong>PERSONA SERIES</strong></span>
      </header>
      <section className="intro">
        <div><p className="eyebrow">YOUR DECK. YOUR ARCANA.</p><h1>アルカナを、その手に。</h1><p className="intro-copy">ファイトに集中。マーカー管理は、ここで。</p></div>
        <div className="hero-number" aria-hidden="true">{series.toUpperCase()}<span>ARCANA TRACKER</span></div>
      </section>
      <nav className="series-tabs" aria-label="ペルソナシリーズ">
        {seriesList.map(({ id, name, subtitle }) => <button key={id} className={`series-tab tab-${id}`} aria-pressed={series === id} onClick={() => selectSeries(id)} disabled={!ready}><span className="tab-title">{name}<span className="tab-dot" /></span><span className="tab-subtitle">{subtitle}</span></button>)}
      </nav>
      <section className="dashboard" aria-label="カウンター概要">
        <div className="dashboard-title"><span className="live-dot" />{series.toUpperCase()} <span>DECK STATUS</span></div>
        <div className="stats"><div><strong>{total.toString().padStart(2, "0")}</strong><span>全アルカナ合計</span></div><div><strong>{complete.toString().padStart(2, "0")}</strong><span>3枚そろった種類</span></div><div><strong>{visible.length}<small> / {arcana.length}</small></strong><span>表示中の種類</span></div></div>
      </section>
      <div className="toolbar"><div><h2>アルカナ一覧</h2><span className="count-hint">各アルカナ 0–3</span></div><div className="toolbar-actions"><button className="secondary-button" aria-expanded={editing} aria-controls="visibility-settings" onClick={() => setEditing(!editing)} disabled={!ready}>{editing ? "✓ 設定を閉じる" : "⚙ 表示設定"}</button><button className="reset-button" onClick={() => resetDialog.current?.showModal()} disabled={!ready || total === 0}>↺ リセット</button></div></div>
      {storageError && <p className="notice" role="status">{storageError}</p>}
      {!ready && <p role="status">保存データを読み込み中…</p>}
      {editing && <section className="visibility-settings" id="visibility-settings" aria-label="アルカナ表示設定"><div className="settings-heading"><div><h3>デッキに使うアルカナを選択</h3><p>非表示にしてもカウントは保持されます。</p></div><button className="secondary-button" onClick={() => setState((previous) => ({ ...previous, decks: { ...previous.decks, [series]: { ...previous.decks[series], hidden: [] } } }))}>すべて表示</button></div><div className="visibility-options">{arcana.map(({ id, name, numeral }) => <label key={id}><input type="checkbox" checked={!deck.hidden.includes(id)} onChange={() => toggleVisibility(id)} /><span className="option-numeral">{numeral}</span>{name}</label>)}</div></section>}
      <section className="arcana-grid" aria-label={`${series.toUpperCase()}のアルカナ`} aria-busy={!ready}>
        {visible.map(({ id, name, numeral, english }) => {
          const count = deck.counts[id] ?? 0;
          return <article key={id} className={`arcana-card ${count === 3 ? "is-complete" : ""}`} aria-label={name}>
            <div className="card-heading"><span className="arcana-numeral">{numeral}</span><span className="card-status">{count === 3 ? "COMPLETE" : "ARCANA"}</span></div>
            <div className="arcana-title"><h3>{name}</h3><p>{english}</p></div>
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
