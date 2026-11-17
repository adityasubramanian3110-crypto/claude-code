import { useEffect, useRef, useState } from 'react';
import type { CardRow, Settings } from '../lib/db';
import type { CatalogEntry } from '../lib/deck';
import { Rating, pickVoice, previewIntervals, wordAudio, wordImage, type Grade } from '../lib/deck';
import { play } from '../lib/audio';
import { NoteEditor } from './NoteEditor';
import { usePhoto } from '../lib/usePhoto';

interface Props {
  entry: CatalogEntry;
  row: CardRow | null; // null for a brand-new card
  settings: Settings;
  onRate: (grade: Grade, extra: { elapsedMs: number }) => void;
}

/**
 * Picture word. Review order follows the spec: audio first, image second, word last.
 * A new card is introduced with everything visible and an invitation to add a personal note or photo.
 */
export function PictureCard({ entry, row, settings, onRate }: Props) {
  const w = entry.word!;
  const isNew = !row;
  const [stage, setStage] = useState<'listen' | 'image' | 'word'>(isNew ? 'word' : 'listen');
  const [voice] = useState(() => pickVoice(settings.voice));
  const { url: photo, note, refresh } = usePhoto(entry.id);
  const shownAt = useRef(Date.now());
  const say = () => play(wordAudio(w, voice));

  useEffect(() => {
    const t = setTimeout(say, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = () => {
    if (stage === 'listen') setStage('image');
    else if (stage === 'image') { setStage('word'); say(); }
  };

  const intervals = row ? previewIntervals(row, new Date(), settings.retention) : null;
  const g = w.g === 'f' ? 'fem' : 'masc';

  return (
    <div className={`card picture-card ${stage !== 'listen' ? g : ''}`} onClick={stage !== 'word' ? advance : undefined}>
      {isNew && <p className="badge new">nuevo</p>}

      <button className="listen" onClick={(e) => { e.stopPropagation(); say(); }} aria-label="Play again">🔊</button>

      {stage === 'listen' ? (
        <div className="picture-slot placeholder">
          <span>?</span>
        </div>
      ) : (
        <div className="picture-slot">
          <img src={photo ?? wordImage(w)} alt="" className={photo ? 'photo' : 'icon'} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        </div>
      )}

      {stage === 'word' ? (
        <>
          <p className={`word ${g}`}>
            <span className="art">{w.art}</span> {w.word}
          </p>
          {isNew ? (
            <>
              <NoteEditor cardId={entry.id} onChange={refresh} />
              <button className="primary" onClick={() => onRate(Rating.Good, { elapsedMs: Date.now() - shownAt.current })}>
                Got it
              </button>
            </>
          ) : (
            <>
              {note && <p className="note">{note}</p>}
              <div className="grades">
                {([
                  [Rating.Again, 'Again'],
                  [Rating.Hard, 'Hard'],
                  [Rating.Good, 'Good'],
                  [Rating.Easy, 'Easy'],
                ] as [Grade, string][]).map(([gr, label]) => (
                  <button key={gr} className={`grade g${gr}`} onClick={() => onRate(gr, { elapsedMs: Date.now() - shownAt.current })}>
                    {label}
                    <small>{intervals?.[gr]}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p className="hint">{stage === 'listen' ? 'Listen. Picture it. Tap to see.' : 'Tap to see the word.'}</p>
      )}
    </div>
  );
}
