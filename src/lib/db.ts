// IndexedDB storage. Everything lives on the phone (Milestone 1 has no sync).
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card as FsrsCard } from 'ts-fsrs';

export type CardKind = 'sound' | 'picture';

/** A card the learner has started. Cards not in this store are still "new". */
export interface CardRow {
  id: string; // s:<contrastId>:<pairIndex> | p:<wordId>
  kind: CardKind;
  fsrs: FsrsCard;
  introduced: number; // ms timestamp
}

export interface ReviewRow {
  id?: number;
  cardId: string;
  rating: number; // ts-fsrs Rating
  ts: number;
  state: number; // FSRS state before the review
  elapsedMs: number; // time spent answering
  correct?: boolean; // sound drills only
  heard?: string; // sound drills: the word that was played
}

export interface SessionRow {
  id?: number;
  mode: 'study' | 'commute' | 'outside';
  start: number;
  end: number;
  items: number;
  newItems: number;
}

export interface NoteRow {
  cardId: string;
  note: string;
  photo?: Blob;
}

export interface Settings {
  newPerDay: number;
  sessionMinutes: number;
  voice: 'both' | 'dalia' | 'jorge';
  retention: number;
}

export const DEFAULT_SETTINGS: Settings = { newPerDay: 10, sessionMinutes: 10, voice: 'both', retention: 0.9 };

interface Schema extends DBSchema {
  cards: { key: string; value: CardRow };
  reviews: { key: number; value: ReviewRow; indexes: { ts: number; cardId: string } };
  sessions: { key: number; value: SessionRow; indexes: { start: number } };
  notes: { key: string; value: NoteRow };
  meta: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null;

export function db() {
  dbp ??= openDB<Schema>('escalera', 1, {
    upgrade(d) {
      d.createObjectStore('cards', { keyPath: 'id' }); // a few hundred rows: filtered in memory
      const reviews = d.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true });
      reviews.createIndex('ts', 'ts');
      reviews.createIndex('cardId', 'cardId');
      const sessions = d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
      sessions.createIndex('start', 'start');
      d.createObjectStore('notes', { keyPath: 'cardId' });
      d.createObjectStore('meta');
    },
  });
  return dbp;
}

/** Test hook: forget the cached connection. */
export function _resetDbHandle() {
  dbp = null;
}

export async function putCard(row: CardRow) {
  const d = await db();
  await d.put('cards', row);
}

export async function allCards(): Promise<CardRow[]> {
  return (await db()).getAll('cards');
}

export async function getSettings(): Promise<Settings> {
  const s = (await (await db()).get('meta', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function saveSettings(s: Settings) {
  await (await db()).put('meta', s, 'settings');
}

export async function addReview(r: ReviewRow) {
  await (await db()).add('reviews', r);
}

export async function addSession(s: SessionRow) {
  await (await db()).add('sessions', s);
}

export async function allSessions(): Promise<SessionRow[]> {
  return (await db()).getAll('sessions');
}

export async function reviewsSince(ts: number): Promise<ReviewRow[]> {
  return (await db()).getAllFromIndex('reviews', 'ts', IDBKeyRange.lowerBound(ts));
}

export async function getNote(cardId: string): Promise<NoteRow | undefined> {
  return (await db()).get('notes', cardId);
}

export async function saveNote(n: NoteRow) {
  const d = await db();
  if (!n.note && !n.photo) await d.delete('notes', n.cardId);
  else await d.put('notes', n);
}

export async function allNotes(): Promise<NoteRow[]> {
  return (await db()).getAll('notes');
}

/** Local midnight of the given time, used for the daily new-card cap. */
export function dayStart(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
