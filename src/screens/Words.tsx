import { useState } from 'react';
import { CONTRASTS } from '../content/rung0';
import { WORDS, type Word } from '../content/a1';
import { State, soundAudio, wordAudio, wordImage } from '../lib/deck';
import { playSeq } from '../lib/audio';
import { NoteEditor } from '../components/NoteEditor';
import { usePhoto } from '../lib/usePhoto';
import type { Snapshot } from '../lib/useStore';

const STATE_LABEL: Record<number, string> = { [State.Learning]: 'learning', [State.Review]: 'known', [State.Relearning]: 'relearning' };

export function Words({ snap }: { snap: Snapshot }) {
  const [tab, setTab] = useState<'pictures' | 'sounds'>('pictures');
  const [open, setOpen] = useState<Word | null>(null);
  const byId = new Map(snap.cards.map((c) => [c.id, c]));

  return (
    <section className="screen">
      <div className="tabs">
        <button className={tab === 'pictures' ? 'on' : ''} onClick={() => setTab('pictures')}>Pictures</button>
        <button className={tab === 'sounds' ? 'on' : ''} onClick={() => setTab('sounds')}>Sounds</button>
      </div>

      {tab === 'pictures' ? (
        <div className="grid">
          {WORDS.map((w) => {
            const st = byId.get(`p:${w.id}`)?.fsrs.state;
            return (
              <button key={w.id} className={`tile ${w.g === 'f' ? 'fem' : 'masc'} ${st === undefined ? 'unseen' : ''}`} onClick={() => setOpen(w)}>
                <Thumb w={w} />
                <span>{w.word}</span>
                {st !== undefined && st !== State.New && <small>{STATE_LABEL[st]}</small>}
              </button>
            );
          })}
        </div>
      ) : (
        CONTRASTS.map((c) => (
          <div key={c.id} className="card">
            <h3>{c.title} <span className="ipa">{c.hint}</span></h3>
            <div className="chips">
              {c.pairs.map((p, i) => {
                const st = byId.get(`s:${c.id}:${i}`)?.fsrs.state;
                return (
                  <button
                    key={i}
                    className={`chip ${st === undefined ? 'unseen' : ''}`}
                    onClick={() => playSeq([soundAudio(p[0], 'dalia'), soundAudio(p[1], 'dalia')])}
                  >
                    {p[0]} · {p[1]}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      {open && <WordSheet w={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Thumb({ w }: { w: Word }) {
  const { url } = usePhoto(`p:${w.id}`);
  return <img src={url ?? wordImage(w)} alt="" loading="lazy" className={url ? 'photo' : 'icon'} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />;
}

function WordSheet({ w, onClose }: { w: Word; onClose: () => void }) {
  const { url, refresh } = usePhoto(`p:${w.id}`);
  const g = w.g === 'f' ? 'fem' : 'masc';
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet card ${g}`} onClick={(e) => e.stopPropagation()}>
        <div className="picture-slot">
          <img src={url ?? wordImage(w)} alt="" className={url ? 'photo' : 'icon'} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
        </div>
        <p className={`word ${g}`}><span className="art">{w.art}</span> {w.word}</p>
        <button className="ghost" onClick={() => playSeq([wordAudio(w, 'dalia'), wordAudio(w, 'jorge')])}>🔊 Listen</button>
        <NoteEditor cardId={`p:${w.id}`} onChange={refresh} />
        <button className="primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
