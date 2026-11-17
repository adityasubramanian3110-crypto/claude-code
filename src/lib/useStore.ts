import { useCallback, useEffect, useState } from 'react';
import { allCards, allSessions, dayStart, getSettings, reviewsSince, type CardRow, type SessionRow, type Settings } from './db';
import { State } from './deck';

export interface Snapshot {
  cards: CardRow[];
  settings: Settings;
  sessions: SessionRow[];
  newToday: number;
}

/** Loads everything the screens need; small enough to read in full. */
export function useSnapshot() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const reload = useCallback(async () => {
    const [cards, settings, sessions, today] = await Promise.all([
      allCards(), getSettings(), allSessions(), reviewsSince(dayStart()),
    ]);
    setSnap({ cards, settings, sessions, newToday: today.filter((r) => r.state === State.New).length });
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return [snap, reload] as const;
}
