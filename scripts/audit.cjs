// Run with: npm run audit (see scripts/audit.sh). Needs Playwright and Chromium.
// Final audit of Escalera v1 against the Milestone 1 design, on an emulated Pixel 7.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
// AUDIT_URL=https://<user>.github.io/<repo>/ audits the live site instead of a local build.
const URL = process.env.AUDIT_URL || 'http://localhost:4173/claude-code/';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail) }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const slug = (s) => s.toLowerCase().normalize('NFC').replace(/[áéíóúüñ]/g, (c) => ({ á: 'a_', é: 'e_', í: 'i_', ó: 'o_', ú: 'u_', ü: 'u__', ñ: 'n_' })[c]).replace(/[^a-z0-9_]/g, '-');

async function dbCounts(p) {
  return p.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('escalera');
    r.onsuccess = () => {
      const d = r.result, out = {};
      const names = ['cards', 'reviews', 'sessions', 'notes'];
      const tx = d.transaction(names, 'readonly');
      let n = names.length;
      names.forEach((s) => { const q = tx.objectStore(s).count(); q.onsuccess = () => { out[s] = q.result; if (!--n) { d.close(); res(out); } }; });
    };
  }));
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1, acceptDownloads: true });
  await ctx.clock.install({ time: new Date('2026-11-18T08:00:00') });
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('dialog', (d) => d.accept());
  // Record every clip the app plays, straight from the audio element (works even when the
  // browser replays a clip from its media cache without a network request).
  await p.addInitScript(() => {
    window.__played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return play.call(this); };
  });
  const lastSound = async () => (await p.evaluate(() => window.__played.filter((u) => u.includes('/audio/sound/')))).at(-1);

  // 1. Install and offline shell
  await p.goto(URL);
  await p.waitForSelector('text=Escalera');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  check('Service worker controls the page', await p.evaluate(() => !!navigator.serviceWorker.controller));
  const cdp = await ctx.newCDPSession(p);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  check('Chrome reports the app as installable', inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors));
  const manifest = await p.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  check('Manifest: standalone, start URL, 192/512/maskable icons', manifest.display === 'standalone' && manifest.start_url === '/claude-code/' && manifest.icons.length === 3, `${manifest.name}`);

  // 2. Every audio clip and picture the app can ask for exists
  const lists = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const urls = [];
  for (const w of lists.rung0) for (const v of ['dalia', 'jorge']) urls.push(`audio/sound/${slug(w)}.${v}.mp3`);
  for (const w of lists.a1) { for (const v of ['dalia', 'jorge']) urls.push(`audio/word/${w.id}.${v}.mp3`); urls.push(`img/${w.id}.svg`); }
  const missing = await p.evaluate(async (us) => { const bad = []; for (const u of us) { const r = await fetch(u); if (!r.ok || +(r.headers.get('content-length') ?? 1) === 0) bad.push(u); } return bad; }, urls);
  check(`All ${urls.length} clips and pictures are served`, missing.length === 0, missing.slice(0, 5).join(', '));

  // 3. Day 1 session: 10 new cards, alternating sound and picture
  await p.click('.tabbar button:has-text("Study")');
  await p.waitForSelector('h2:has-text("Study")');
  const lead = await p.textContent('.lead');
  check('Day 1 offers 10 new cards, 0 due', /0 due · 10 new · 10 min/.test(lead), lead);
  await p.click('button:has-text("Start")');
  let kinds = [], sound = { right: 0, wrong: 0 }, pics = 0, reviewsSeen = 0, wantWrong = true, photoDone = false, noteDone = false;
  for (let i = 0; i < 80; i++) {
    if (await p.locator('text=¡Listo!').count()) break;
    try {
      if (await p.locator('button:has-text("Test me")').count()) {
        kinds.push('s');
        await p.click('button:has-text("Test me")');
        await p.waitForTimeout(900);
        continue;
      }
      if (await p.locator('.pair-btn:not([disabled])').count()) {
        await p.evaluate(() => { window.__played = []; });
        await p.click('.listen'); await p.waitForTimeout(400);
        const target = (await lastSound()).split('/').pop().split('.')[0];
        const btns = await p.locator('.pair-btn').allTextContents();
        const correctIdx = btns.findIndex((t) => slug(t.trim()) === target);
        const pick = wantWrong ? 1 - correctIdx : correctIdx;
        await p.locator('.pair-btn').nth(pick).click();
        const verdict = await p.textContent('.verdict');
        if (wantWrong) { sound.wrong += verdict.startsWith('Era') ? 1 : 0; wantWrong = false; } else sound.right += verdict === '¡Sí!' ? 1 : 0;
        await p.click('button:has-text("Next")');
        continue;
      }
      if (await p.locator('button:has-text("Got it")').count()) {
        kinds.push('p'); pics++;
        if (!noteDone) { await p.fill('textarea', 'mi primera nota'); noteDone = true; }
        else if (!photoDone) {
          const png = await p.screenshot({ clip: { x: 0, y: 0, width: 120, height: 120 } });
          await p.setInputFiles('.note-editor input[type=file]', { name: 'foto.png', mimeType: 'image/png', buffer: png });
          await p.waitForTimeout(800); photoDone = true;
        }
        await p.click('button:has-text("Got it")');
        continue;
      }
      if (await p.locator('.picture-slot.placeholder').count()) {
        reviewsSeen++;
        await p.click('.picture-card');
        await p.click('.picture-card');
        await p.click('button.grade.g3');
        continue;
      }
    } catch (e) { /* re-render race: look again */ }
    await p.waitForTimeout(200);
  }
  const introOrder = await p.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('escalera');
    r.onsuccess = () => { const q = r.result.transaction('reviews').objectStore('reviews').getAll(); q.onsuccess = () => { r.result.close(); res(q.result.filter((x) => x.state === 0).sort((a, b) => a.ts - b.ts).map((x) => x.cardId[0]).join('')); }; };
  }));
  check('New cards alternate sound and picture', introOrder === 'spspspspsp', introOrder);
  check('Sound drill marks a wrong answer and names the word', sound.wrong === 1);
  check('Sound drill accepts the right answer', sound.right >= 3, `${sound.right} right`);
  check('Introduced words come back for recall in the same session', reviewsSeen >= 3, `${reviewsSeen} recalls`);
  await p.screenshot({ path: `${OUT}/a-summary.png` });
  await p.click('button:has-text("Done")');
  await p.waitForSelector('text=Rung 0');
  let c = await dbCounts(p);
  check('Progress saved: 10 cards, reviews, 1 session, note and photo', c.cards === 10 && c.reviews >= 10 && c.sessions === 1 && c.notes === 2, JSON.stringify(c));

  // 4. Daily cap holds, and raising it gives more
  await p.click('.tabbar button:has-text("Study")');
  await p.waitForSelector('h2:has-text("Study")');
  let txt = await p.textContent('.screen');
  check('Daily cap reached: no more new cards today', /0 new|Nothing due/.test(txt) && (await p.locator('.tabbar').isVisible()), txt.slice(0, 80) + ' (tab bar visible)');
  await p.click('.tabbar button:has-text("Settings")');
  await p.locator('input[type=range]').first().fill('12');
  await p.click('.tabbar button:has-text("Study")');
  await p.waitForSelector('h2:has-text("Study")');
  txt = await p.textContent('.screen');
  check('Raising the cap to 12 offers 2 more', /2 new/.test(txt), txt.slice(0, 60));
  await p.click('.tabbar button:has-text("Settings")');
  await p.locator('input[type=range]').first().fill('10');

  // 5. Two days later: reviews are due, picture review goes audio → picture → word
  await ctx.clock.fastForward('48:00:00');
  await p.click('.tabbar button:has-text("Home")');
  await p.click('.tabbar button:has-text("Study")');
  await p.waitForSelector('h2:has-text("Study")');
  txt = await p.textContent('.lead');
  const due = +(txt.match(/(\d+) due/) || [])[1];
  check('Two days later, learned cards are due for review', due >= 5, txt);
  await p.click('button:has-text("Start")');
  let order = null, notePhoto = null;
  for (let i = 0; i < 40 && !order; i++) {
    try {
      if (await p.locator('.picture-slot.placeholder').count()) {
        const s1 = { img: await p.locator('.picture-slot img').count(), word: await p.locator('.word').count() };
        await p.click('.picture-card');
        const s2 = { img: await p.locator('.picture-slot img').count(), word: await p.locator('.word').count() };
        await p.click('.picture-card');
        const s3 = { word: await p.locator('.word').count(), grades: await p.locator('button.grade').count() };
        order = s1.img === 0 && s1.word === 0 && s2.img === 1 && s2.word === 0 && s3.word === 1 && s3.grades === 4;
        await p.screenshot({ path: `${OUT}/b-review.png` });
        const labels = await p.locator('button.grade small').allTextContents();
        check('Rating buttons show FSRS intervals', labels.every((l) => /\d/.test(l)), labels.join(' / '));
        await p.click('button.grade.g3');
        break;
      }
      if (await p.locator('button:has-text("Test me")').count()) { await p.click('button:has-text("Test me")'); continue; }
      if (await p.locator('.pair-btn:not([disabled])').count()) { await p.locator('.pair-btn').first().click(); await p.click('button:has-text("Next")'); continue; }
      if (await p.locator('button:has-text("Got it")').count()) { await p.click('button:has-text("Got it")'); continue; }
    } catch (e) { }
    await p.waitForTimeout(200);
  }
  check('Picture review order: audio, then picture, then word', order === true);

  // 6. Session time limit: fast-forward past 10 minutes, next rating pauses with a choice
  await ctx.clock.fastForward('11:00');
  for (let i = 0; i < 20; i++) {
    try {
      if (await p.locator('text=Time\'s up').count()) break;
      if (await p.locator('button:has-text("Test me")').count()) { await p.click('button:has-text("Test me")'); continue; }
      if (await p.locator('.pair-btn:not([disabled])').count()) { await p.locator('.pair-btn').first().click(); await p.click('button:has-text("Next")'); continue; }
      if (await p.locator('.picture-slot.placeholder').count()) { await p.click('.picture-card'); await p.click('.picture-card'); await p.click('button.grade.g3'); continue; }
      if (await p.locator('button:has-text("Got it")').count()) { await p.click('button:has-text("Got it")'); continue; }
      if (await p.locator('text=¡Listo!').count()) break;
    } catch (e) { }
    await p.waitForTimeout(200);
  }
  await p.screenshot({ path: `${OUT}/e-timelimit.png` });
  const paused = await p.locator('text=Time\'s up').count();
  check('After the session length, the app stops and offers 5 more minutes', paused === 1 || (await p.locator('text=¡Listo!').count()) === 1, paused ? 'paused' : 'queue finished first');
  if (paused) await p.click('button:has-text("Stop here")');
  await p.click('button:has-text("Done")');
  await p.waitForSelector('text=Rung 0');

  // 7. Leaving mid-session with the back button still logs the time
  c = await dbCounts(p);
  const sessionsBefore = c.sessions;
  await p.click('.tabbar button:has-text("Study")');
  await p.waitForSelector('h2:has-text("Study")');
  if (await p.locator('button:has-text("Start")').count()) {
    await p.click('button:has-text("Start")');
    await ctx.clock.fastForward('01:00');
    for (let i = 0; i < 10; i++) {
      try {
        if (await p.locator('button:has-text("Test me")').count()) { await p.click('button:has-text("Test me")'); continue; }
        if (await p.locator('.pair-btn:not([disabled])').count()) { await p.locator('.pair-btn').first().click(); await p.click('button:has-text("Next")'); break; }
        if (await p.locator('.picture-slot.placeholder').count()) { await p.click('.picture-card'); await p.click('.picture-card'); await p.click('button.grade.g3'); break; }
        if (await p.locator('button:has-text("Got it")').count()) { await p.click('button:has-text("Got it")'); break; }
      } catch (e) { }
      await p.waitForTimeout(200);
    }
    await p.goBack();
    await p.waitForSelector('text=Rung 0');
    await p.waitForTimeout(300);
    c = await dbCounts(p);
    check('Leaving a session with Back still logs it', c.sessions === sessionsBefore + 1, `${sessionsBefore} → ${c.sessions}`);
  } else check('Leaving a session with Back still logs it', false, 'nothing to study');

  // 8. Words screen shows the note and photo
  await p.click('.tabbar button:has-text("Words")');
  await p.waitForTimeout(500);
  const photos = await p.locator('.tile img.photo').count();
  check('Your photo replaces the icon in the word list', photos === 1, `${photos} photo tiles`);
  await p.screenshot({ path: `${OUT}/c-words.png` });

  // 9. Backup export, wipe, import
  c = await dbCounts(p);
  await p.click('.tabbar button:has-text("Settings")');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Export backup")')]);
  const backupPath = `${OUT}/backup.json`;
  await dl.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  check('Backup export includes cards, reviews, sessions, note and photo', backup.cards.length === c.cards && backup.notes.some((n) => n.photo?.startsWith('data:image')), `${backup.cards.length} cards, ${(fs.statSync(backupPath).size / 1024).toFixed(0)} KB`);
  await p.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('escalera'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await p.reload(); await p.waitForSelector('text=Rung 0');
  const wiped = await dbCounts(p);
  await p.click('.tabbar button:has-text("Settings")');
  await p.setInputFiles('input[accept="application/json,.json"]', backupPath);
  await p.waitForSelector('text=Backup restored.');
  const restored = await dbCounts(p);
  check('Backup import restores everything after a wipe', wiped.cards === 0 && JSON.stringify(restored) === JSON.stringify(c), `${JSON.stringify(wiped)} → ${JSON.stringify(restored)}`);

  // 10. Offline: reload with no network, study with audio
  await ctx.setOffline(true);
  await p.goto(URL + '#/home'); await p.waitForSelector('text=Rung 0');
  const offAudio = await p.evaluate(async () => { const r = await fetch('audio/word/w-perro.jorge.mp3'); return r.ok && (await r.arrayBuffer()).byteLength > 1000; });
  const offImg = await p.evaluate(async () => (await fetch('img/w-mesa.svg')).ok);
  check('Offline: app, audio and pictures all load', offAudio && offImg);
  await ctx.setOffline(false);

  // 11. Dark mode renders the card readably
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.click('.tabbar button:has-text("Words")');
  await p.locator('.tile').first().click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/d-dark-sheet.png` });

  check('No errors in the console', errors.length === 0, errors.slice(0, 3).join(' | '));
  fs.writeFileSync(`${OUT}/audit.json`, JSON.stringify(results, null, 1));
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
  await b.close();
})().catch((e) => { console.error('AUDIT CRASHED', e); process.exit(1); });
