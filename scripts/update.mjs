// Refreshes the data-driven parts of the profile:
//   - assets/cards/*.svg  (featured repos with live star/fork counts)
//   - assets/stats-*.svg  (stars and forks on public repos, contributions by month)
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

// ---------- stats ----------
// Two cards the width of a repo card: stars and forks on my public repositories, and contributions by month.
async function graphql(query, variables) {
  if (!token) throw new Error('GraphQL needs GITHUB_TOKEN');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'profile-readme-updater', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GraphQL ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 200)}`);
  return json.data;
}

const SW = 340;
const SH = 112;
const b600 = readB64('scripts/fonts/jbmono-600.woff2');
const statsHead = (label, t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>${fontFace(b64, 400)}${fontFace(b600, 600)}text{font-family:${MONO};font-weight:400}.v{font-weight:600}</style>
<rect x=".5" y=".5" width="${SW - 1}" height="${SH - 1}" rx="8" fill="${t.surface}" stroke="${t.border}"/>`;
// Label with its octicon, the value in text ink (never the accent), and a dim note under it.
const tile = (x, icon, label, value, note, t) => `<g transform="translate(${x} 19) scale(.875)" fill="${t.accent}"><path d="${icon}"/></g>
<text x="${x + 20}" y="31" font-size="12" fill="${t.muted}">${esc(label)}</text>
<text class="v" x="${x}" y="73" font-size="32" fill="${t.text}">${esc(value)}</text>
<text x="${x}" y="94" font-size="11" fill="${t.dim}">${esc(note)}</text>`;

const own = repos.filter((r) => !r.fork);
const stars = own.reduce((n, r) => n + r.stargazers_count, 0);
const forks = own.reduce((n, r) => n + r.forks_count, 0);
const starterRe = new RegExp(cfg.stats.starters);
const starterForks = own.filter((r) => starterRe.test(r.name)).reduce((n, r) => n + r.forks_count, 0);
const forkNote = forks && starterForks / forks >= 0.5 ? `${Math.round((100 * starterForks) / forks)}% on starter repos` : `on ${own.length} public repos`;

for (const [name, t] of Object.entries(themes)) {
  write(`assets/stats-repos-${name}.svg`, `${statsHead(`${stars} stars and ${forks} forks on ${own.length} public repositories`, t)}
${tile(20, ICON.star, 'stars', fmt(stars), `on ${own.length} public repos`, t)}
<line x1="168" y1="20" x2="168" y2="92" stroke="${t.border}"/>
${tile(186, ICON.fork, 'forks', fmt(forks), forkNote, t)}
</svg>
`);
}

// Contributions per calendar month, the current (partial) month last and in the accent.
let contributions = null;
try {
  const data = await graphql(
    'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}',
    { login: cfg.user },
  );
  const cal = data.user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const byMonth = new Map();
  for (const d of days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.contributionCount);
  const last = new Date(`${days[days.length - 1].date}T00:00:00Z`);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - 11 + i, 1));
    const key = d.toISOString().slice(0, 7);
    return { key, initial: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })[0], count: byMonth.get(key) ?? 0 };
  });
  contributions = { total: cal.totalContributions, months };
} catch (err) {
  console.warn(`skip contributions card: ${err.message}`);
}

if (contributions) {
  const { total, months } = contributions;
  const X0 = 156;
  const X1 = SW - 20;
  const BASE = 78;
  const MAXH = 46;
  const step = (X1 - X0) / months.length;
  const bw = 8;
  const max = Math.max(1, ...months.map((m) => m.count));
  const bar = (x, h) => {
    const r = Math.min(2, h / 2, bw / 2);
    return `M${x} ${BASE}V${BASE - h + r}Q${x} ${BASE - h} ${x + r} ${BASE - h}H${x + bw - r}Q${x + bw} ${BASE - h} ${x + bw} ${BASE - h + r}V${BASE}Z`;
  };
  for (const [name, t] of Object.entries(themes)) {
    const bars = months
      .map((m, i) => {
        const x = +(X0 + i * step + (step - bw) / 2).toFixed(1);
        const h = m.count ? Math.max(2, (m.count / max) * MAXH) : 0;
        const current = i === months.length - 1;
        return `${h ? `<path d="${bar(x, +h.toFixed(1))}" fill="${current ? t.accent : t.dim}"${current ? '' : ' fill-opacity=".55"'}/>` : ''}
<text x="${(x + bw / 2).toFixed(1)}" y="96" font-size="9" fill="${current ? t.accent : t.dim}" text-anchor="middle">${m.initial}</text>`;
      })
      .join('\n');
    write(`assets/stats-activity-${name}.svg`, `${statsHead(`${total} contributions in the last 12 months`, t)}
${tile(20, ICON.commit, 'contributions', fmt(total), 'last 12 months', t)}
<line x1="${X0}" y1="${BASE + 0.5}" x2="${X1}" y2="${BASE + 0.5}" stroke="${t.border}"/>
${bars}
</svg>
`);
  }
}

console.log(`cards: ${cfg.featured.length}, stars: ${stars}, forks: ${forks}, contributions: ${contributions ? contributions.total : 'skipped'}`);
