import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Study } from './screens/Study';
import { Words } from './screens/Words';
import { Settings } from './screens/Settings';
import { useSnapshot } from './lib/useStore';

type Route = 'home' | 'study' | 'words' | 'settings';
const ROUTES: Route[] = ['home', 'study', 'words', 'settings'];
const readHash = (): Route => {
  const h = location.hash.replace('#/', '') as Route;
  return ROUTES.includes(h) ? h : 'home';
};

export default function App() {
  const [route, setRoute] = useState<Route>(readHash);
  const [snap, reload] = useSnapshot();

  // Hash routes so Android's back button moves between screens.
  useEffect(() => {
    const on = () => { setRoute(readHash()); reload(); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, [reload]);

  const go = (r: string) => { location.hash = `#/${r}`; };

  if (!snap) return <div className="screen center"><p className="hint">Loading…</p></div>;

  return (
    <div className="app">
      <main>
        {route === 'home' && <Home snap={snap} go={go} />}
        {route === 'study' && <Study key={snap.cards.length + ':' + snap.sessions.length} snap={snap} onDone={() => go('home')} />}
        {route === 'words' && <Words snap={snap} />}
        {route === 'settings' && <Settings snap={snap} onChange={reload} />}
      </main>
      {route !== 'study' && (
        <nav className="tabbar">
          {([['home', '⌂', 'Home'], ['study', '▶', 'Study'], ['words', '▦', 'Words'], ['settings', '⚙', 'Settings']] as const).map(
            ([r, icon, label]) => (
              <button key={r} className={route === r ? 'on' : ''} onClick={() => go(r)}>
                <span aria-hidden>{icon}</span>
                {label}
              </button>
            ),
          )}
        </nav>
      )}
    </div>
  );
}
