// Copies the OpenMoji SVG for each A1 word into public/img/<id>.svg.
// Words with no emoji (or no OpenMoji file) are listed so they can be generated.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { WORDS, emojiCode } from '../src/content/a1.ts';

const SRC = 'node_modules/openmoji/color/svg';
const OUT = 'public/img';
mkdirSync(OUT, { recursive: true });
const missing: string[] = [];
for (const w of WORDS) {
  const dest = `${OUT}/${w.id}.svg`;
  if (!w.emoji) { const f = w.pic === 'generated' ? `${OUT}/${w.id}.webp` : dest; if (!existsSync(f)) missing.push(w.word); continue; }
  const code = emojiCode(w.emoji);
  const cands = [code, code.replace(/-FE0F/g, '')];
  const hit = cands.map((c) => `${SRC}/${c}.svg`).find(existsSync);
  if (hit) copyFileSync(hit, dest);
  else missing.push(`${w.word} (${w.emoji} ${code})`);
}
console.log(`${WORDS.length} words, ${missing.length} without an icon:`, missing);
