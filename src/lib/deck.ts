// Card catalog, FSRS scheduling and session queue. Pure functions where possible.
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import { CONTRASTS, type Contrast } from '../content/rung0';
import { WORDS, slug, type Word } from '../content/a1';
import type { CardKind, CardRow } from './db';

export { Rating, State };
export type { Grade };

export interface CatalogEntry {
  id: string;
  kind: CardKind;
  contrast?: Contrast;
  pair?: [string, string];
  word?: Word;
}

/** Sound cards: contrast by contrast, but the first pair of every contrast comes first. */
function soundOrder(): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  const maxPairs = Math.max(...CONTRASTS.map((c) => c.pairs.length));
  for (let round = 0; round < maxPairs; round += 2) {
    for (const c of CONTRASTS) {
      for (const i of [round, round + 1]) {
        if (i < c.pairs.length) out.push({ id: `s:${c.id}:${i}`, kind: 'sound', contrast: c, pair: c.pairs[i] });
      }
    }
  }
  return out;
}

/** Picture cards: round-robin across topics so a session isn't all fruit. */
function pictureOrder(): CatalogEntry[] {
  const byTopic = new Map<string, Word[]>();
  for (const w of WORDS) byTopic.set(w.topic, [...(byTopic.get(w.topic) ?? []), w]);
  const lists = [...byTopic.values()];
  const out: CatalogEntry[] = [];
  for (let i = 0; out.length < WORDS.length; i++)
    for (const l of lists) if (i < l.length) out.push({ id: `p:${l[i].id}`, kind: 'picture', word: l[i] });
  return out;
}

export const SOUND_CARDS = soundOrder();
export const PICTURE_CARDS = pictureOrder();
export const CATALOG = new Map<string, CatalogEntry>([...SOUND_CARDS, ...PICTURE_CARDS].map((e) => [e.id, e]));

export function scheduler(retention = 0.9) {
  return fsrs(generatorParameters({
    request_retention: retention,
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
  }));
}

export function newCard(entry: CatalogEntry, now: Date): CardRow {
  return { id: entry.id, kind: entry.kind, fsrs: createEmptyCard(now), introduced: now.getTime() };
}

export function rate(row: CardRow, grade: Grade, now: Date, retention = 0.9): CardRow {
  const { card } = scheduler(retention).next(row.fsrs, now, grade);
  return { ...row, fsrs: card };
}

/** Human interval label for the rating buttons: "1 min", "10 min", "3 d"... */
export function previewIntervals(row: CardRow, now: Date, retention = 0.9): Record<Grade, string> {
  const p = scheduler(retention).repeat(row.fsrs, now);
  const out = {} as Record<Grade, string>;
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[])
    out[g] = fmtInterval(new Date(p[g].card.due).getTime() - now.getTime());
  return out;
}

export function fmtInterval(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} d`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `${mo} m` : `${(d / 365).toFixed(1)} a`;
}

export const isDue = (row: CardRow, now: Date) => new Date(row.fsrs.due).getTime() <= now.getTime();

export interface QueueItem {
  id: string;
  isNew: boolean;
}

/**
 * Build a session queue: due cards (most overdue first), then up to `newAllowed` new cards
 * alternating sound and picture. Reviews come first so a short session always clears what is due.
 */
export function buildQueue(rows: CardRow[], now: Date, newAllowed: number): QueueItem[] {
  const due = rows
    .filter((r) => isDue(r, now) && CATALOG.has(r.id))
    .sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime())
    .map((r) => ({ id: r.id, isNew: false }));
  const seen = new Set(rows.map((r) => r.id));
  const sounds = SOUND_CARDS.filter((e) => !seen.has(e.id));
  const pics = PICTURE_CARDS.filter((e) => !seen.has(e.id));
  const fresh: QueueItem[] = [];
  while (fresh.length < newAllowed && (sounds.length || pics.length)) {
    const takeSound = sounds.length && (!pics.length || fresh.length % 2 === 0);
    const e = takeSound ? sounds.shift()! : pics.shift()!;
    fresh.push({ id: e.id, isNew: true });
  }
  // Spread new cards through the reviews so each session mixes old and new.
  if (!due.length) return fresh;
  const out: QueueItem[] = [];
  const gap = Math.max(1, Math.floor(due.length / (fresh.length + 1)));
  let fi = 0;
  due.forEach((d, i) => {
    out.push(d);
    if ((i + 1) % gap === 0 && fi < fresh.length) out.push(fresh[fi++]);
  });
  return out.concat(fresh.slice(fi));
}

/**
 * After a rating, decide where (if anywhere) the card goes back in this session's queue.
 * Learning steps (1 and 10 minutes) come back a few cards later, so a word met for the first time
 * gets a recall check in the same session. Anything scheduled further out waits for its due date.
 */
export function requeuePosition(row: CardRow, now: Date, sessionEndsAt: number, queueLength: number): number | null {
  const due = new Date(row.fsrs.due).getTime();
  const minutes = (due - now.getTime()) / 60000;
  if (minutes > 10 && due > sessionEndsAt) return null;
  const spacing = minutes <= 1 ? 3 : 8;
  return Math.min(queueLength, spacing);
}

export function soundAudio(word: string, voice: string) {
  return `${import.meta.env.BASE_URL}audio/sound/${slug(word)}.${voice}.mp3`;
}

export function wordAudio(word: Word, voice: string) {
  return `${import.meta.env.BASE_URL}audio/word/${word.id}.${voice}.mp3`;
}

export function wordImage(word: Word) {
  return `${import.meta.env.BASE_URL}img/${word.id}.${word.emoji ? 'svg' : 'webp'}`;
}

export function pickVoice(pref: 'both' | 'dalia' | 'jorge'): string {
  if (pref !== 'both') return pref;
  return Math.random() < 0.5 ? 'dalia' : 'jorge';
}

export type { FsrsCard };
