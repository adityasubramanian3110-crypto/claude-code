# Escalera: Spanish, Milestone 1

An installable PWA for Android Chrome that teaches Latin American Spanish. It follows the Fluent Forever and Pimsleur spec. Milestone 1 covers **Rung 0 and the core of Study mode**:

- **Sound drills (Rung 0):** 12 minimal-pair contrasts (r/rr, stress, n/ñ, vowels, b/p, d/t, g/k, r/l, j/g), 62 pairs. You hear one word and pick which one it was. Each pair is recorded by two es-MX voices so you learn the sound, not the speaker. Seseo and yeísmo are assumed, so s/z and ll/y are not drilled.
- **Picture words (A1):** 178 picturable nouns in Mexican/neutral vocabulary (carro, celular, jugo, chamarra, elote…). Reviews go audio first, then image, then word. Gender is coded by colour (blue masculine, rose feminine) on the frame, article and word, and includes exceptions like *el agua*, *el mapa* and *la mano*. There is no English on cards. Each card takes your own note and photo.
- **FSRS scheduling** (`ts-fsrs`): 1-minute and 10-minute learning steps, so new words come back in the same session. Target recall defaults to 90%. The daily new-card cap defaults to 10, alternating sound and picture.
- **10-minute sessions:** due reviews first, with new cards mixed in. When time is up you choose whether to stop or add 5 minutes. Each session is logged (minutes and items) for the pace tracker in Milestone 4.
- **Offline-first:** a service worker precaches the app, every audio clip and every image. Progress lives in IndexedDB on the phone, with JSON backup export and import in Settings.

## Install on your phone

1. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**. Pages on a private repo needs a paid GitHub plan; otherwise make the repo public or use another static host (`BASE=/ npm run build`).
2. Merge to `main`. The `Deploy to GitHub Pages` workflow tests, builds and publishes.
3. Open `https://<user>.github.io/<repo>/` in Chrome on Android, then tap **⋮ → Add to Home screen / Install app**.
4. Open it once while online so everything is cached. After that it works with no signal.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/claude-code/
npm test           # scheduler, queue, content and storage tests
npm run build      # production build + service worker in dist/
```

## Content pipeline

Content is plain TypeScript in `src/content/` (`rung0.ts`, `a1.ts`). After changing it:

| Step | Command | Needs |
| --- | --- | --- |
| Icons | `npm run icons` copies the OpenMoji SVG per word into `public/img/` and lists words with no icon | nothing |
| Generated images | `npm run images` makes an image for words with no icon (`emoji: ''`), currently only *mesa* | `AZURE_OPENAI_RESOURCE`, `AZURE_OPENAI_IMAGE_DEPLOYMENT`, plus `AZURE_OPENAI_KEY` (or a proxy-injected key) |
| Audio | `npm run audio` synthesises every clip with es-MX Dalia and Jorge into `public/audio/`. Existing files are skipped | `AZURE_SPEECH_KEY` (or a proxy-injected key), optionally `AZURE_SPEECH_REGION` (default `eastus`) |
| App icons | `npm run app-icons` renders `public/favicon.svg` to the manifest PNGs | Playwright |

Generated audio and images are committed, so the deploy needs no secrets.

## Layout

```
src/content/      rung 0 contrasts, A1 words
src/lib/deck.ts   catalog, FSRS wrapper, session queue (pure, tested)
src/lib/db.ts     IndexedDB stores: cards, reviews, sessions, notes, meta
src/components/   SoundCard, PictureCard, NoteEditor
src/screens/      Home, Study, Words, Settings
scripts/          icon, image and audio build scripts
```

## Credits

Illustrations: [OpenMoji](https://openmoji.org), the open-source emoji and icon project, licensed CC BY-SA 4.0. Voices: Azure AI Speech neural voices es-MX-DaliaNeural and es-MX-JorgeNeural.
