// Generates the static artwork: assets/banner-*.svg and assets/stack-*.svg
// Needs python with fonttools + brotli (only to subset the embedded font): pip install fonttools brotli
//   node scripts/build-static.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, themes, MONO, esc, fontFace, write } from './lib/common.mjs';

const SRC_FONT = path.join(ROOT, 'scripts', 'fonts', 'JetBrainsMono-latin.woff2');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-font-'));

function subset(weight, text, outFile) {
  const inst = path.join(tmp, `inst${weight}.woff2`);
  const textFile = path.join(tmp, `text${weight}.txt`);
  fs.writeFileSync(textFile, [...new Set(text)].join(''), 'utf8');
  const py = (mod, ...args) => execFileSync('python', ['-m', mod, ...args], { stdio: 'pipe' });
  py('fontTools.varLib.instancer', SRC_FONT, `wght=${weight}`, '-o', inst);
  py('fontTools.subset', inst, `--text-file=${textFile}`, '--flavor=woff2', '--layout-features=', '--no-hinting', '--desubroutinize', `--output-file=${outFile}`);
  return fs.readFileSync(outFile).toString('base64');
}

// Card font (regular weight, printable ASCII) is committed because CI embeds it too.
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '\u00b7\u2014\u2026';
subset(400, ascii, path.join(ROOT, 'scripts', 'fonts', 'jbmono-400.woff2'));

// ---------- banner ----------
const NAME = 'Hung N. Dang';
const TAGLINE = ['backend systems', 'teaching', 'information theory'];
const FOOT = 'Hanoi \u00b7 21.03\u00b0N 105.85\u00b0E';

const nameB64 = subset(700, NAME, path.join(tmp, 'name.woff2'));
const bodyB64 = subset(400, TAGLINE.join(' / ') + FOOT, path.join(tmp, 'body.woff2'));

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function banner(t, name) {
  const W = 1000;
  const H = 280;
  const TX = 56;
  const rand = rng(1701);
  const stars = [];
  while (stars.length < 46) {
    const x = Math.round(rand() * 960 + 20);
    const y = Math.round(rand() * 160 + 14);
    const r = +(0.7 + rand() * 0.8).toFixed(1);
    const o = +(0.18 + rand() * 0.32).toFixed(2);
    const near = x > 36 && x < 760 && y > 56 && y < 178;
    const lamp = x > 780 && x < 960 && y > 110;
    if (!near && !lamp) stars.push({ x, y, r, o, tw: stars.length % 5 === 0 });
  }
  const tagWidth = TAGLINE.join(' / ').length * 24 * 0.6;
  const ticks = [];
  for (let x = TX, i = 0; x <= W - TX; x += 12, i++) ticks.push(`M${x} 200v${i % 5 === 0 ? 8 : 4}`);
  const lampX = 868;
  const tagline = TAGLINE.map((w, i) => `<tspan fill="${t.muted}">${w}</tspan>${i < TAGLINE.length - 1 ? `<tspan fill="${t.accent}"> / </tspan>` : ''}`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hung N. Dang. Backend systems, teaching, information theory.">
<title>Hung N. Dang. Backend systems, teaching, information theory.</title>
<style>
${fontFace(nameB64, 700)}
${fontFace(bodyB64, 400)}
.n{font-family:${MONO};font-weight:700}
.b{font-family:${MONO};font-weight:400}
.c{animation:blink 1.1s steps(1) infinite}
.tw{animation:tw 7s ease-in-out infinite}
.h{transform-box:fill-box;transform-origin:center;animation:pulse 6s ease-in-out infinite}
@keyframes blink{50%{opacity:0}}
@keyframes tw{0%,100%{opacity:.12}50%{opacity:.7}}
@keyframes pulse{0%,100%{opacity:.12;transform:scale(1)}50%{opacity:.26;transform:scale(1.18)}}
@media (prefers-reduced-motion:reduce){.c,.tw,.h{animation:none}}
</style>
<defs>
<linearGradient id="hz" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${t.dim}" stop-opacity="0"/><stop offset=".5" stop-color="${t.dim}" stop-opacity=".7"/><stop offset="1" stop-color="${t.dim}" stop-opacity="0"/></linearGradient>
<linearGradient id="cone" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity=".2"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient>
</defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${t.bg}" stroke="${t.border}"/>
<g fill="${t.text}">
${stars.map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" opacity="${s.o}"${s.tw ? ` class="tw" style="animation-delay:-${(s.x % 7) + 1}s"` : ''}/>`).join('\n')}
</g>
<text class="n" x="${TX}" y="118" font-size="64" fill="${t.text}">${esc(NAME)}</text>
<text class="b" x="${TX}" y="160" font-size="24">${tagline}</text>
<rect class="c" x="${TX + tagWidth + 8}" y="141" width="13" height="23" fill="${t.accent}"/>
<path d="M0 200H${W}" stroke="url(#hz)" stroke-width="1"/>
<path d="${ticks.join('')}" stroke="${t.dim}" stroke-opacity=".35" stroke-width="1" fill="none"/>
<path d="M${lampX} 150L${lampX - 52} 200H${lampX + 52}Z" fill="url(#cone)"/>
<path d="M${lampX} 152V200" stroke="${t.dim}" stroke-width="2" stroke-opacity=".8"/>
<circle class="h" cx="${lampX}" cy="148" r="18" fill="${t.accent}" opacity=".16"/>
<circle cx="${lampX}" cy="148" r="4" fill="${t.accent}"/>
<text class="b" x="${TX}" y="254" font-size="14" fill="${t.dim}">${esc(FOOT)}</text>
</svg>
`;
}

for (const [name, t] of Object.entries(themes)) write(`assets/banner-${name}.svg`, banner(t, name));

// ---------- stack ----------
const GROUPS = [
  ['languages', [['java', 'Java'], ['csharp', 'C#'], ['typescript', 'TypeScript'], ['python', 'Python'], ['go', 'Go']]],
  ['data', [['postgresql', 'PostgreSQL'], ['microsoftsqlserver', 'SQL Server'], ['oracle', 'Oracle'], ['mongodb', 'MongoDB'], ['redis', 'Redis']]],
  ['delivery', [['linux', 'Linux'], ['docker', 'Docker'], ['jenkins', 'Jenkins'], ['githubactions', 'GH Actions']]],
];
const pathOf = (id) => /\sd="([^"]+)"/.exec(fs.readFileSync(path.join(ROOT, 'scripts', 'icons', `${id}.svg`), 'utf8'))[1];

const stackFontB64 = fs.readFileSync(path.join(ROOT, 'scripts', 'fonts', 'jbmono-400.woff2')).toString('base64');
const TILE = 84;
const WIDTH = 5 * TILE;
const ICON_SCALE = { oracle: 0.5 }; // wordmark, much wider than tall

function group(label, items, t) {
  const w = WIDTH;
  const tiles = items
    .map(([id, text], i) => {
      const cx = i * TILE + TILE / 2;
      const s = ICON_SCALE[id] ?? 0.25;
      return `<g transform="translate(${cx - 64 * s} ${48 - 64 * s}) scale(${s})" fill="${t.accent}"><path d="${pathOf(id)}"/></g>
<text x="${cx}" y="84" font-size="11" fill="${t.muted}" text-anchor="middle">${esc(text)}</text>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="96" viewBox="0 0 ${w} 96" role="img" aria-label="${esc(label)}: ${esc(items.map((i) => i[1]).join(', '))}">
<title>${esc(label)}: ${esc(items.map((i) => i[1]).join(', '))}</title>
<style>${fontFace(stackFontB64, 400)}text{font-family:${MONO};font-weight:400}</style>
<text x="8" y="13" font-size="11" fill="${t.dim}">${esc(label)}</text>
<path d="M8 21H${w - 8}" stroke="${t.border}"/>
${tiles}
</svg>
`;
}

for (const [name, t] of Object.entries(themes)) {
  for (const [label, items] of GROUPS) write(`assets/stack-${label}-${name}.svg`, group(label, items, t));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('static assets written');
