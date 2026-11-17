// Export / import all progress as a single JSON file (photos inlined as data URLs).
import { db, type CardRow, type NoteRow, type ReviewRow, type SessionRow } from './db';

interface Backup {
  app: 'escalera';
  version: 1;
  exported: string;
  cards: CardRow[];
  reviews: ReviewRow[];
  sessions: SessionRow[];
  notes: (Omit<NoteRow, 'photo'> & { photo?: string })[];
  settings: unknown;
}

const toDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

export async function exportBackup(): Promise<Blob> {
  const d = await db();
  const notes = await Promise.all(
    (await d.getAll('notes')).map(async (n) => ({ ...n, photo: n.photo ? await toDataUrl(n.photo) : undefined })),
  );
  const data: Backup = {
    app: 'escalera',
    version: 1,
    exported: new Date().toISOString(),
    cards: await d.getAll('cards'),
    reviews: await d.getAll('reviews'),
    sessions: await d.getAll('sessions'),
    notes,
    settings: await d.get('meta', 'settings'),
  };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export async function importBackup(file: File) {
  const data = JSON.parse(await file.text()) as Backup;
  if (data.app !== 'escalera' || data.version !== 1) throw new Error('That file is not an Escalera backup.');
  // Decode photos before the transaction: awaiting other work inside it would auto-commit it.
  const notes: NoteRow[] = await Promise.all(
    data.notes.map(async (n) => ({ ...n, photo: n.photo ? await (await fetch(n.photo)).blob() : undefined })),
  );
  const d = await db();
  const tx = d.transaction(['cards', 'reviews', 'sessions', 'notes', 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').clear(),
    tx.objectStore('reviews').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('notes').clear(),
  ]);
  for (const c of data.cards) await tx.objectStore('cards').put(c);
  for (const r of data.reviews) await tx.objectStore('reviews').put(r);
  for (const s of data.sessions) await tx.objectStore('sessions').put(s);
  for (const n of notes) await tx.objectStore('notes').put(n);
  if (data.settings) await tx.objectStore('meta').put(data.settings, 'settings');
  await tx.done;
}
