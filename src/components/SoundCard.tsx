import { useEffect, useRef, useState } from 'react';
import type { CatalogEntry } from '../lib/deck';
import { Rating, pickVoice, soundAudio, type Grade } from '../lib/deck';
import { play, playSeq } from '../lib/audio';
import type { Settings } from '../lib/db';

interface Props {
  entry: CatalogEntry;
  isNew: boolean;
  settings: Settings;
  onRate: (grade: Grade, extra: { correct: boolean; heard: string; elapsedMs: number }) => void;
}

/** Minimal-pair drill: hear one word of the pair, pick which one it was. */
export function SoundCard({ entry, isNew, settings, onRate }: Props) {
  const pair = entry.pair!;
  const c = entry.contrast!;
  const [stage, setStage] = useState<'intro' | 'quiz' | 'answered'>(isNew ? 'intro' : 'quiz');
  const [target] = useState(() => pair[Math.random() < 0.5 ? 0 : 1]);
  const [voice] = useState(() => pickVoice(settings.voice));
  const [chosen, setChosen] = useState<string | null>(null);
  const shownAt = useRef(Date.now());

  const playTarget = () => play(soundAudio(target, voice));

  useEffect(() => {
    if (stage === 'intro') {
      // Each word in both voices so the ear separates sound from speaker.
      playSeq([soundAudio(pair[0], 'dalia'), soundAudio(pair[1], 'dalia'), soundAudio(pair[0], 'jorge'), soundAudio(pair[1], 'jorge')], 450);
    } else if (stage === 'quiz') {
      shownAt.current = Date.now();
      const t = setTimeout(playTarget, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const choose = (w: string) => {
    if (stage !== 'quiz') return;
    setChosen(w);
    setStage('answered');
  };

  const correct = chosen === target;

  return (
    <div className="card sound-card">
      <div className="contrast-label">
        <span>{c.title}</span>
        <span className="ipa">{c.hint}</span>
      </div>

      {stage === 'intro' ? (
        <>
          <p className="badge new">nuevo</p>
          <div className="pair">
            {pair.map((w) => (
              <button key={w} className="pair-btn" onClick={() => playSeq([soundAudio(w, 'dalia'), soundAudio(w, 'jorge')])}>
                {w}
              </button>
            ))}
          </div>
          <p className="hint">Tap each word to hear it again.</p>
          <button className="primary" onClick={() => setStage('quiz')}>Test me</button>
        </>
      ) : (
        <>
          <button className="listen" onClick={playTarget} aria-label="Play again">🔊</button>
          <div className="pair">
            {pair.map((w) => {
              const cls = stage === 'answered' ? (w === target ? 'right' : w === chosen ? 'wrong' : '') : '';
              return (
                <button key={w} className={`pair-btn ${cls}`} onClick={() => choose(w)} disabled={stage === 'answered'}>
                  {w}
                </button>
              );
            })}
          </div>
          {stage === 'answered' && (
            <>
              <p className={`verdict ${correct ? 'right' : 'wrong'}`}>{correct ? '¡Sí!' : `Era «${target}»`}</p>
              <div className="row">
                <button className="ghost" onClick={() => playSeq([soundAudio(pair[0], voice), soundAudio(pair[1], voice)])}>
                  Compare both
                </button>
                <button
                  className="primary"
                  onClick={() =>
                    onRate(correct ? Rating.Good : Rating.Again, { correct, heard: target, elapsedMs: Date.now() - shownAt.current })
                  }
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
