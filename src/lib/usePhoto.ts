import { useEffect, useState } from 'react';
import { getNote } from './db';

/** The learner's own note and photo (as an object URL) for a card. */
export function usePhoto(cardId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [rev, setRev] = useState(0);
  useEffect(() => {
    let u: string | null = null;
    getNote(cardId).then((n) => {
      setNote(n?.note ?? '');
      if (n?.photo) { u = URL.createObjectURL(n.photo); setUrl(u); } else setUrl(null);
    });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [cardId, rev]);
  return { url, note, refresh: () => setRev((r) => r + 1) };
}
