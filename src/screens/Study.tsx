import { useEffect, useRef, useState } from 'react';
import { SoundCard } from '../components/SoundCard';
import { PictureCard } from '../components/PictureCard';
import { addReview, addSession, putCard, type CardRow } from '../lib/db';
import { CATALOG, buildQueue, newCard, rate, requeuePosition, type Grade, type QueueItem } from '../lib/deck';
import { stop } from '../lib/audio';
import type { Snapshot } from '../lib/useStore';

interface Run {
  queue: QueueItem[];
  rows: Map<string, CardRow>;
  start: number;
  endsAt: number;
  step: number;
  seen: Set<string>;
  newSeen: number;
  correct: number;
  drills: number;
  paused: boolean; // time is up and cards remain: ask before continuing
}

export function Study({ snap, onDone }: { snap: Snapshot; onDone: () => void }) {
  const [run, setRun] = useState<Run | null>(null);
  const [finished, setFinished] = useState<Run | null>(null);
  // How much of the running session is already logged: time, cards and new cards.
  const logged = useRef({ until: 0, items: 0, newItems: 0 });
  const busy = useRef(false);
  /** Log the part of the session since the last log (called on finish and whenever the app is hidden). */
  function logSegment(r: Run) {
    const l = logged.current;
    const end = Date.now();
    const items = r.seen.size - l.items;
    if (end - l.until < 5000 && !items) return Promise.resolve();
    logged.current = { until: end, items: r.seen.size, newItems: r.newSeen };
    return addSession({ mode: 'study', start: l.until, end, items, newItems: r.newSeen - l.newItems });
  }
  const live = useRef<Run | null>(null); // the running session, for logging if the screen is left
  const [, tick] = useState(0);
  live.current = run;

  // Hide the tab bar only while a session is running.
  useEffect(() => {
    document.body.toggleAttribute('data-session', !!run);
    return () => document.body.removeAttribute('data-session');
  }, [run]);

  // Keep the minutes-left counter moving between cards.
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [run]);

  // Leaving mid-session (Android back button, closing the app) still logs the time studied.
  useEffect(() => {
    const save = () => { if (live.current) logSegment(live.current); };
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); save(); stop(); };
  }, []);

  const newAllowed = Math.max(0, snap.settings.newPerDay - snap.newToday);
  const preview = buildQueue(snap.cards, new Date(), newAllowed);
  const dueCount = preview.filter((q) => !q.isNew).length;
  const newCount = preview.length - dueCount;

  const begin = () => {
    const now = Date.now();
    logged.current = { until: now, items: 0, newItems: 0 };
    setRun({
      queue: preview,
      rows: new Map(snap.cards.map((r) => [r.id, r])),
      start: now,
      endsAt: now + snap.settings.sessionMinutes * 60000,
      step: 0,
      seen: new Set(),
      newSeen: 0,
      correct: 0,
      drills: 0,
      paused: false,
    });
  };

  const finish = async (r: Run) => {
    stop();
    await logSegment(r);
    setRun(null);
    setFinished(r);
  };

  if (finished) {
    const mins = Math.max(1, Math.round((Date.now() - finished.start) / 60000));
    return (
      <section className="screen center">
        <h2>¡Listo!</h2>
        <div className="stats">
          <div><b>{finished.seen.size}</b><span>cards</span></div>
          <div><b>{finished.newSeen}</b><span>new</span></div>
          <div><b>{mins}</b><span>min</span></div>
          {finished.drills > 0 && (
            <div><b>{Math.round((100 * finished.correct) / finished.drills)}%</b><span>sounds heard right</span></div>
          )}
        </div>
        <button className="primary" onClick={onDone}>Done</button>
      </section>
    );
  }

  if (!run) {
    return (
      <section className="screen center">
        <h2>Study</h2>
        {preview.length ? (
          <>
            <p className="lead">{dueCount} due · {newCount} new · {snap.settings.sessionMinutes} min</p>
            <button className="primary big" onClick={begin}>Start</button>
            <p className="hint">Turn the sound up. Audio plays first.</p>
          </>
        ) : (
          <p className="lead">Nothing due and today's new cards are done. Come back tomorrow, or raise the daily limit in Settings.</p>
        )}
      </section>
    );
  }

  const item = run.queue[0];
  const entry = item && CATALOG.get(item.id);
  const row = item ? run.rows.get(item.id) ?? null : null;
  const remainingMin = Math.max(0, Math.ceil((run.endsAt - Date.now()) / 60000));

  const onRate = async (grade: Grade, extra: { elapsedMs: number; correct?: boolean; heard?: string }) => {
    if (busy.current) return; // ignore a double tap while the rating is being saved
    busy.current = true;
    const now = new Date();
    const before = row ?? newCard(entry!, now);
    const after = rate(before, grade, now, snap.settings.retention);
    await putCard(after);
    await addReview({ cardId: after.id, rating: grade, ts: now.getTime(), state: before.fsrs.state, ...extra });

    const queue = run.queue.slice(1);
    // Bring learning cards back only while other cards remain; otherwise the same card would
    // repeat back-to-back. It stays due and opens the next session.
    const pos = queue.length ? requeuePosition(after, now, run.endsAt, queue.length) : null;
    if (pos !== null) queue.splice(pos, 0, { id: after.id, isNew: false });
    const next: Run = {
      ...run,
      queue,
      rows: new Map(run.rows).set(after.id, after),
      step: run.step + 1,
      seen: new Set(run.seen).add(after.id),
      newSeen: run.newSeen + (row ? 0 : 1),
      correct: run.correct + (extra.correct ? 1 : 0),
      drills: run.drills + (extra.correct === undefined ? 0 : 1),
    };
    busy.current = false;
    if (!queue.length) finish(next);
    else setRun({ ...next, paused: now.getTime() >= run.endsAt });
  };

  return (
    <section className="screen study">
      <header className="study-bar">
        <button className="ghost small" onClick={() => finish(run)}>End</button>
        <span>{run.queue.length} left</span>
        <span>{remainingMin} min</span>
      </header>
      {run.paused ? (
        <OvertimePrompt
          left={run.queue.length}
          onStop={() => finish(run)}
          onContinue={() => setRun({ ...run, paused: false, endsAt: Date.now() + 5 * 60000 })}
        />
      ) : entry && (entry.kind === 'sound' ? (
        <SoundCard key={`${item.id}-${run.step}`} entry={entry} isNew={!row} settings={snap.settings} onRate={onRate} />
      ) : (
        <PictureCard key={`${item.id}-${run.step}`} entry={entry} row={row} settings={snap.settings} onRate={onRate} />
      ))}
    </section>
  );
}

function OvertimePrompt({ left, onStop, onContinue }: { left: number; onStop: () => void; onContinue: () => void }) {
  return (
    <div className="card center">
      <h3>Time's up</h3>
      <p>{left} cards still in the queue.</p>
      <div className="row">
        <button className="ghost" onClick={onStop}>Stop here</button>
        <button className="primary" onClick={onContinue}>5 more minutes</button>
      </div>
    </div>
  );
}
