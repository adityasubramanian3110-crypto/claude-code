import { useEffect, useRef, useState } from 'react';
import { getNote, saveNote } from '../lib/db';

/** Shrink a camera photo to at most 800px so IndexedDB stays small. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82));
}

export function NoteEditor({ cardId, onChange }: { cardId: string; onChange?: () => void }) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Blob | undefined>();
  const [saved, setSaved] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getNote(cardId).then((n) => { setNote(n?.note ?? ''); setPhoto(n?.photo); setSaved(true); });
  }, [cardId]);

  const persist = async (next: { note: string; photo?: Blob }) => {
    await saveNote({ cardId, ...next });
    setSaved(true);
    onChange?.();
  };

  return (
    <div className="note-editor">
      <textarea
        value={note}
        placeholder="Your note: a memory, a place, a person this word reminds you of"
        rows={2}
        onChange={(e) => { setNote(e.target.value); setSaved(false); }}
        onBlur={() => !saved && persist({ note, photo })}
      />
      <div className="row">
        <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
          {photo ? 'Change photo' : 'Add your photo'}
        </button>
        {photo && (
          <button type="button" className="ghost" onClick={() => { setPhoto(undefined); persist({ note, photo: undefined }); }}>
            Remove photo
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const b = await shrink(f);
          setPhoto(b);
          await persist({ note, photo: b });
          e.target.value = '';
        }}
      />
    </div>
  );
}
