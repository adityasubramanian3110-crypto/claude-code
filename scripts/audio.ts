// Pre-generates all app audio with Azure neural voices (es-MX) into public/audio.
// Run: AZURE_SPEECH_KEY=... npm run audio   (existing files are skipped)
// Region defaults to eastus; override with AZURE_SPEECH_REGION.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { CONTRASTS, SOUND_VOICES, rung0Words } from '../src/content/rung0.ts';
import { WORDS, slug } from '../src/content/a1.ts';

const REGION = process.env.AZURE_SPEECH_REGION ?? 'eastus';
const KEY = process.env.AZURE_SPEECH_KEY ?? 'proxy-injected';
const URL = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
const FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function ssml(voice: string, text: string, rate: string) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX">` +
    `<voice name="${voice}"><prosody rate="${rate}">${esc(text)}</prosody></voice></speak>`;
}

async function synth(voice: string, text: string, rate: string, out: string) {
  if (existsSync(out)) return 'skip';
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': FORMAT,
        'User-Agent': 'spanish-pwa-build',
      },
      body: ssml(voice, text, rate),
    });
    if (res.ok) {
      writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      return 'ok';
    }
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} ${res.headers.get('x-proxy-error') ?? ''} for "${text}"`);
  }
  throw new Error(`gave up on "${text}"`);
}

const jobs: (() => Promise<string>)[] = [];
const voiceTag = (v: string) => v.replace('es-MX-', '').replace('Neural', '').toLowerCase();

mkdirSync('public/audio/sound', { recursive: true });
mkdirSync('public/audio/word', { recursive: true });

// Rung 0: bare word, slightly slower so the contrast is audible. Both voices.
for (const w of rung0Words())
  for (const v of SOUND_VOICES)
    jobs.push(() => synth(v, w, '-10%', `public/audio/sound/${slug(w)}.${voiceTag(v)}.mp3`));

// A1: article + word, so gender is heard with the word. Both voices.
for (const w of WORDS)
  for (const v of SOUND_VOICES)
    jobs.push(() => synth(v, `${w.art} ${w.word}`, '-5%', `public/audio/word/${w.id}.${voiceTag(v)}.mp3`));

let done = 0, made = 0;
const workers = Array.from({ length: 4 }, async () => {
  while (jobs.length) {
    const r = await jobs.shift()!();
    done++; if (r === 'ok') made++;
    if (done % 50 === 0) console.log(`${done} clips...`);
  }
});
await Promise.all(workers);
console.log(`Done: ${made} generated, ${done - made} already present. ${CONTRASTS.length} contrasts, ${WORDS.length} words.`);
