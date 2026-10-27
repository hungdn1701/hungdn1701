// Refreshes the data-driven parts of the profile:
//   - assets/cards/*.svg  (featured repos with live star/fork counts)
//   - the "Now" block in README.md (recently pushed public repos)
// Runs in CI with GITHUB_TOKEN; locally: GITHUB_TOKEN=$(gh auth token) node scripts/update.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, themes, MONO, esc, fontFace, readB64, write, ICON } from './lib/common.mjs';

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'profile.config.json'), 'utf8'));
const token = process.env.GITHUB_TOKEN;

async function api(url) {
  const res = await fetch(`https://api.github.com${url}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'profile-readme-updater',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
}

const repos = [];
for (let page = 1; ; page++) {
  const batch = await api(`/users/${cfg.user}/repos?type=owner&per_page=100&page=${page}`);
  repos.push(...batch);
  if (batch.length < 100) break;
}
const byName = new Map(repos.map((r) => [r.name, r]));

// ---------- cards ----------
const W = 340;
const H = 140;
const CHAR = 0.6; // JetBrains Mono advance, in em

function wrap(text, maxChars, maxLines) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/.{0,2}$/, '') + '...';
    return kept;
  }
  return lines;
}

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));

function card(item, repo, t, b64) {
  const titleSize = Math.min(14, (W - 42 - 20) / (item.repo.length * CHAR));
  const desc = wrap(item.description, 40, 3);
  const stars = fmt(repo.stargazers_count);
  const forks = fmt(repo.forks_count);
  const starTextX = 38;
  const forkIconX = starTextX + stars.length * 12 * CHAR + 14;
  const forkTextX = forkIconX + 18;
  const label = `${item.repo}: ${item.description}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>${fontFace(b64, 400)}text{font-family:${MONO};font-weight:400}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="8" fill="${t.surface}" stroke="${t.border}"/>
<g transform="translate(20 17)" fill="${t.dim}"><path d="${ICON.repo}"/></g>
<text x="42" y="30" font-size="${titleSize.toFixed(2)}" fill="${t.accent}">${esc(item.repo)}</text>
${desc.map((l, i) => `<text x="20" y="${58 + i * 19}" font-size="12" fill="${t.muted}">${esc(l)}</text>`).join('\n')}
<line x1="20" y1="106" x2="${W - 20}" y2="106" stroke="${t.border}"/>
<g transform="translate(20 114) scale(.875)" fill="${t.dim}"><path d="${ICON.star}"/></g>
<text x="${starTextX}" y="126" font-size="12" fill="${t.dim}">${stars}</text>
<g transform="translate(${forkIconX.toFixed(1)} 114) scale(.875)" fill="${t.dim}"><path d="${ICON.fork}"/></g>
<text x="${forkTextX.toFixed(1)}" y="126" font-size="12" fill="${t.dim}">${forks}</text>
<text x="${W - 20}" y="126" font-size="12" fill="${t.dim}" text-anchor="end">${esc(item.tags.join(' \u00b7 '))}</text>
</svg>
`;
}

const b64 = readB64('scripts/fonts/jbmono-400.woff2');
for (const item of cfg.featured) {
  const repo = byName.get(item.repo);
  if (!repo) {
    console.warn(`skip card: ${item.repo} not found among public repos`);
    continue;
  }
  for (const [name, t] of Object.entries(themes)) {
    write(`assets/cards/${item.repo}-${name}.svg`, card(item, repo, t, b64));
  }
}

// ---------- now ----------
const excludes = cfg.now.exclude.map((p) => new RegExp(p));
const featured = new Set(cfg.featured.map((f) => f.repo));
const cutoff = Date.now() - cfg.now.maxAgeDays * 864e5;
const recent = repos
  .filter((r) => !r.fork && !r.archived && !featured.has(r.name) && !excludes.some((re) => re.test(r.name)))
  .filter((r) => Date.parse(r.pushed_at) >= cutoff)
  .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
  .slice(0, cfg.now.limit);

const short = (s, n) => (s.length > n ? s.slice(0, n - 3).trimEnd() + '...' : s);
const lines = recent.map((r) => {
  const desc = r.description ? ` \u2014 ${short(r.description.replace(/\s+/g, ' ').trim(), 64)}` : '';
  return `- [\`${r.name}\`](${r.html_url})${desc} <sub>pushed ${r.pushed_at.slice(0, 10)}</sub>`;
});

const readmePath = path.join(ROOT, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const next = readme.replace(
  /(<!-- NOW:START -->)[\s\S]*?(<!-- NOW:END -->)/,
  (_, start, end) =>   `${start}\n${lines.length ? lines.join('\n') : '_Nothing pushed recently._'}\n${end}`,
);
if (next !== readme) fs.writeFileSync(readmePath, next, 'utf8');
console.log(`cards: ${cfg.featured.length}, now: ${recent.length}, readme ${next !== readme ? 'updated' : 'unchanged'}`);
