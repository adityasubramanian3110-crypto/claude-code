#!/usr/bin/env bash
# End-to-end audit: builds the app, serves it, and drives every Milestone 1 feature on an emulated Pixel 7.
# Screenshots, the backup file and audit.json land in audit-output/.
set -euo pipefail
OUT=audit-output
mkdir -p "$OUT"
node --experimental-strip-types -e "import('./src/content/rung0.ts').then(async r=>{const a=await import('./src/content/a1.ts');require('fs').writeFileSync('$OUT/lists.json',JSON.stringify({rung0:r.rung0Words(),a1:a.WORDS.map(w=>({id:w.id}))}))})" 2>/dev/null
npx vite build >/dev/null
npx vite preview --port 4173 --strictPort >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 2
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node scripts/audit.cjs "$OUT" "$OUT/lists.json"
