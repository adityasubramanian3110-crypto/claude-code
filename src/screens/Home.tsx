import { CONTRASTS } from '../content/rung0';
import { dayStart } from '../lib/db';
import { PICTURE_CARDS, SOUND_CARDS, State, buildQueue } from '../lib/deck';
import type { Snapshot } from '../lib/useStore';

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export function Home({ snap, go }: { snap: Snapshot; go: (r: string) => void }) {
  const now = new Date();
  const newAllowed = Math.max(0, snap.settings.newPerDay - snap.newToday);
  const q = buildQueue(snap.cards, now, newAllowed);
  const due = q.filter((x) => !x.isNew).length;

  const byId = new Map(snap.cards.map((c) => [c.id, c]));
  // "Known" = graduated to Review state; "mature" = stability of 21+ days (the checkpoint bar in the spec).
  const known = (ids: string[]) => ids.filter((id) => byId.get(id)?.fsrs.state === State.Review).length;
  const mature = (ids: string[]) => ids.filter((id) => (byId.get(id)?.fsrs.stability ?? 0) >= 21).length;
  const soundIds = SOUND_CARDS.map((e) => e.id);
  const picIds = PICTURE_CARDS.map((e) => e.id);

  const today = snap.sessions.filter((s) => s.start >= dayStart());
  const minToday = Math.round(today.reduce((a, s) => a + (s.end - s.start), 0) / 60000);
  const hours = snap.sessions.reduce((a, s) => a + (s.end - s.start), 0) / 3600000;

  return (
    <section className="screen">
      <h1 className="brand">Escalera</h1>
      <div className="card hero">
        <p className="lead">
          {due} due · {Math.min(newAllowed, q.length - due)} new today
        </p>
        <button className="primary big" onClick={() => go('study')} disabled={!q.length}>
          {q.length ? 'Study' : 'All done today'}
        </button>
        <p className="hint">{minToday} min today · {hours.toFixed(1)} h total</p>
      </div>

      <div className="card">
        <h3>Rung 0 · sounds</h3>
        <Bar value={pct(known(soundIds), soundIds.length)} />
        <p className="hint">
          {known(soundIds)} of {soundIds.length} pairs learned · {mature(soundIds)} mature · {CONTRASTS.length} contrasts
        </p>
      </div>

      <div className="card">
        <h3>A1 · picture words</h3>
        <Bar value={pct(known(picIds), picIds.length)} />
        <p className="hint">
          {known(picIds)} of {picIds.length} words learned · {mature(picIds)} mature
        </p>
      </div>
    </section>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${value}%` }} />
    </div>
  );
}
