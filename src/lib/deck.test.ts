import { describe, expect, it } from 'vitest';
import { CONTRASTS, rung0Words } from '../content/rung0';
import { WORDS, slug } from '../content/a1';
import { CATALOG, PICTURE_CARDS, Rating, SOUND_CARDS, State, buildQueue, fmtInterval, newCard, rate, requeuePosition } from './deck';

const T0 = new Date('2026-11-17T09:00:00');

describe('content', () => {
  it('has the agreed scope: 12 contrasts and ~150+ words with unique ids', () => {
    expect(CONTRASTS).toHaveLength(12);
    expect(WORDS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    expect(CATALOG.size).toBe(SOUND_CARDS.length + PICTURE_CARDS.length);
  });

  it('keeps accented minimal pairs apart in file names', () => {
    expect(slug('papa')).not.toBe(slug('papá'));
    expect(slug('esta')).not.toBe(slug('está'));
    expect(slug('una')).not.toBe(slug('uña'));
    const slugs = rung0Words().map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('codes gender exceptions correctly', () => {
    const g = (w: string) => WORDS.find((x) => x.word === w)!;
    expect(g('agua')).toMatchObject({ art: 'el', g: 'f' });
    expect(g('mapa')).toMatchObject({ art: 'el', g: 'm' });
    expect(g('mano')).toMatchObject({ art: 'la', g: 'f' });
  });
});

describe('FSRS scheduling', () => {
  it('moves a new card into short learning steps, then to days once learned', () => {
    let row = newCard(SOUND_CARDS[0], T0);
    row = rate(row, Rating.Good, T0);
    expect(row.fsrs.state).toBe(State.Learning);
    const due1 = new Date(row.fsrs.due).getTime() - T0.getTime();
    expect(due1).toBeLessThanOrEqual(10 * 60000);

    const t1 = new Date(row.fsrs.due);
    row = rate(row, Rating.Good, t1);
    expect(row.fsrs.state).toBe(State.Review);
    expect(new Date(row.fsrs.due).getTime() - t1.getTime()).toBeGreaterThanOrEqual(24 * 3600000);
  });

  it('sends a lapsed review card to relearning', () => {
    let row = newCard(PICTURE_CARDS[0], T0);
    row = rate(rate(row, Rating.Good, T0), Rating.Good, new Date(T0.getTime() + 600000));
    const later = new Date(row.fsrs.due);
    row = rate(row, Rating.Again, later);
    expect(row.fsrs.state).toBe(State.Relearning);
    expect(row.fsrs.lapses).toBe(1);
  });

  it('formats intervals', () => {
    expect(fmtInterval(60000)).toBe('1 min');
    expect(fmtInterval(3 * 3600000)).toBe('3 h');
    expect(fmtInterval(4 * 86400000)).toBe('4 d');
  });
});

describe('session queue', () => {
  it('respects the daily new-card cap and alternates sound and picture', () => {
    const q = buildQueue([], T0, 6);
    expect(q).toHaveLength(6);
    expect(q.every((x) => x.isNew)).toBe(true);
    expect(q.map((x) => x.id[0]).join('')).toBe('spspsp');
  });

  it('serves due cards first, skips cards not yet due, and never re-introduces seen cards', () => {
    const due = rate(newCard(SOUND_CARDS[0], T0), Rating.Again, T0); // due in 1 min
    const notDue = rate(rate(newCard(PICTURE_CARDS[0], T0), Rating.Good, T0), Rating.Good, T0); // days away
    const q = buildQueue([due, notDue], new Date(T0.getTime() + 120000), 2);
    expect(q[0]).toEqual({ id: due.id, isNew: false });
    expect(q.filter((x) => x.isNew)).toHaveLength(2);
    expect(q.find((x) => x.id === notDue.id)).toBeUndefined();
    expect(q.filter((x) => x.id === due.id)).toHaveLength(1);
  });

  it('brings learning steps back in the same session, but not graduated cards', () => {
    const end = T0.getTime() + 600000;
    const missed = rate(newCard(SOUND_CARDS[0], T0), Rating.Again, T0); // 1 min step
    expect(requeuePosition(missed, T0, end, 20)).toBe(3);
    const introduced = rate(newCard(PICTURE_CARDS[0], T0), Rating.Good, T0); // 10 min step
    expect(requeuePosition(introduced, T0, end, 20)).toBe(8);
    expect(requeuePosition(introduced, T0, end, 2)).toBe(2);
    const t1 = new Date(introduced.fsrs.due);
    const graduated = rate(introduced, Rating.Good, t1); // days away
    expect(requeuePosition(graduated, t1, end, 20)).toBeNull();
  });
});
