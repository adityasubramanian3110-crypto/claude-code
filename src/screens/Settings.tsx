import { useEffect, useRef, useState } from 'react';
import { saveSettings, type Settings as S } from '../lib/db';
import { exportBackup, importBackup } from '../lib/backup';
import type { Snapshot } from '../lib/useStore';

export function Settings({ snap, onChange }: { snap: Snapshot; onChange: () => void }) {
  const [s, setS] = useState<S>(snap.settings);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted); }, []);

  const update = async (patch: Partial<S>) => {
    const next = { ...s, ...patch };
    setS(next);
    await saveSettings(next);
    onChange();
  };

  const download = async () => {
    const blob = await exportBackup();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `escalera-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <section className="screen">
      <h2>Settings</h2>
      <div className="card form">
        <label>
          New cards per day <b>{s.newPerDay}</b>
          <input type="range" min={0} max={30} value={s.newPerDay} onChange={(e) => update({ newPerDay: +e.target.value })} />
        </label>
        <label>
          Session length <b>{s.sessionMinutes} min</b>
          <input type="range" min={5} max={30} step={5} value={s.sessionMinutes} onChange={(e) => update({ sessionMinutes: +e.target.value })} />
        </label>
        <label>
          Target recall <b>{Math.round(s.retention * 100)}%</b>
          <input type="range" min={0.8} max={0.97} step={0.01} value={s.retention} onChange={(e) => update({ retention: +e.target.value })} />
          <small>Higher means more reviews. FSRS default is 90%.</small>
        </label>
        <label>
          Voice
          <select value={s.voice} onChange={(e) => update({ voice: e.target.value as S['voice'] })}>
            <option value="both">Both (Dalia and Jorge, es-MX)</option>
            <option value="dalia">Dalia only</option>
            <option value="jorge">Jorge only</option>
          </select>
        </label>
      </div>

      <div className="card form">
        <h3>Your data</h3>
        <p className="hint">
          Progress is stored only on this phone.
          {persisted === false && ' Storage is not yet protected from automatic clearing.'}
          {persisted && ' Storage is protected from automatic clearing.'}
        </p>
        {persisted === false && (
          <button className="ghost" onClick={async () => setPersisted(await navigator.storage.persist())}>Protect storage</button>
        )}
        <div className="row">
          <button className="ghost" onClick={download}>Export backup</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>Import backup</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!confirm('Replace all progress on this phone with this backup?')) return;
            try { await importBackup(f); setMsg('Backup restored.'); onChange(); }
            catch (err) { setMsg((err as Error).message); }
            e.target.value = '';
          }}
        />
        {msg && <p className="hint">{msg}</p>}
      </div>

      <div className="card about">
        <h3>About</h3>
        <p>Milestone 1: Rung 0 sound drills and A1 picture words, scheduled with FSRS. Works offline.</p>
        <p>
          Voices: Azure neural voices es-MX Dalia and Jorge. Illustrations:{' '}
          <a href="https://openmoji.org" target="_blank" rel="noreferrer">OpenMoji</a>, CC BY-SA 4.0.
        </p>
      </div>
    </section>
  );
}
