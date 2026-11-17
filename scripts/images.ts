// Generates an illustration for each A1 word that has no OpenMoji icon (emoji: ''),
// styled to sit beside OpenMoji: flat colours, thick black outline, no text.
// Run: AZURE_OPENAI_RESOURCE=<name> AZURE_OPENAI_IMAGE_DEPLOYMENT=<deployment> npm run images
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { WORDS } from '../src/content/a1.ts';

const RESOURCE = process.env.AZURE_OPENAI_RESOURCE;
const DEPLOYMENT = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT;
const KEY = process.env.AZURE_OPENAI_KEY ?? 'proxy-injected';
const API = process.env.AZURE_OPENAI_API_VERSION ?? '2025-04-01-preview';
if (!RESOURCE || !DEPLOYMENT) throw new Error('Set AZURE_OPENAI_RESOURCE and AZURE_OPENAI_IMAGE_DEPLOYMENT');

// English is used only in the generation prompt, never shown in the app.
const SUBJECT: Record<string, string> = { mesa: 'a simple wooden dining table with four legs' };

mkdirSync('public/img', { recursive: true });
for (const w of WORDS.filter((x) => !x.emoji)) {
  const out = `public/img/${w.id}.webp`;
  if (existsSync(out)) continue;
  const subject = SUBJECT[w.word] ?? `a ${w.word} (Spanish word)`;
  const res = await fetch(
    `https://${RESOURCE}.openai.azure.com/openai/deployments/${DEPLOYMENT}/images/generations?api-version=${API}`,
    {
      method: 'POST',
      headers: { 'api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Flat emoji-style icon of ${subject}. OpenMoji style: bold black outlines, flat pastel fills, ` +
          `centered, single object, plain transparent background, no text, no shadow.`,
        size: '1024x1024',
        quality: 'medium',
        output_format: 'webp',
        output_compression: 80,
        background: 'transparent',
        n: 1,
      }),
    },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: { b64_json: string }[] };
  writeFileSync(out, Buffer.from(json.data[0].b64_json, 'base64'));
  console.log('generated', out);
}
