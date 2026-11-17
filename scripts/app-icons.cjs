// Renders public/favicon.svg into the PNG icons the web manifest needs.
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const svg = readFileSync('public/favicon.svg', 'utf8');
(async () => {
const b = await chromium.launch();
const p = await b.newPage();
const shots = [
  ['public/icons/icon-192.png', 192, svg],
  ['public/icons/icon-512.png', 512, svg],
  // Maskable: full-bleed background, artwork inside the 80% safe zone.
  ['public/icons/maskable-512.png', 512, svg.replace('rx="112"', 'rx="0"').replace('<g ', '<g transform="translate(51 51) scale(0.8)" ').replace('<circle ', '<circle transform="translate(51 51) scale(0.8)" ')],
];
for (const [out, size, s] of shots) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>*{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${s}`);
  await p.screenshot({ path: out, omitBackground: true });
}
await b.close();
})();
