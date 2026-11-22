/* Builds the zone planting-calendar pages and the plant pages.
   Run from the repo root:  node scripts/build-pages.mjs
   Reads only repo data: data/charts/lookup.js (NOAA frost dates, USDA zones),
   js/plants.js (spacing, days, frost offsets), js/logic.js (date math), js/charts.js.
   Writes zones/*.html, plants/*.html, and the /zones/ and /plants/ lines in sitemap.xml.
   Every number on these pages is read or computed from those files. Nothing is typed in by hand. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://bloomandbedgarden.com';
const UPDATED = '2026-11-21';
/* The planner link needs a full date. Use the coming spring. Text on the pages has no year. */
const YEAR = 2027;
export const ZONES = ['3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b', '7a', '7b', '8a', '8b', '9a', '9b', '10a', '10b'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATES = {
  AL: 'Alabama', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming'
};

/* Titles and links copied from SOURCES.md. */
const SRC = {
  sdsu: ['South Dakota State University Extension. “Square-Foot Garden Sample Planting Layout.” P-00379. March 2026.', 'https://extension.sdstate.edu/sites/default/files/2026-03/P-00379-v2.pdf'],
  csu720: ['Colorado State University Extension. “Vegetable Planting Guide.” GardenNotes #720.', 'https://extension.colostate.edu/resource/vegetable-planting-guide/'],
  csuMtn: ['Colorado State University Extension. “Vegetable Gardening in the Mountains.”', 'https://extension.colostate.edu/resource/vegetable-gardening-in-the-mountains/'],
  csuAnnual: ['Colorado State University Extension. “Growing Annual Plants from Seed.”', 'https://extension.colostate.edu/resource/growing-annual-plants-from-seed/'],
  ufLeon: ['UF/IFAS Leon County Extension. “Vegetable Square Foot Planting Guide for Northwest Florida.”', 'https://sfyl.ifas.ufl.edu/media/sfylifasufledu/leon/docs/Vegetable-Square-Foot-Planting-Guide-for-Northwest-Florida-PDF-mcj.pdf'],
  ufEny: ['UF/IFAS. “Marigolds (Tagetes spp.) for Nematode Management.” ENY-056.', 'https://edis.ifas.ufl.edu/publication/NG045'],
  umnPlant: ['University of Minnesota Extension. “Planting the vegetable garden.”', 'https://extension.umn.edu/planting-and-growing-guides/planting-vegetable-garden'],
  umnRaised: ['University of Minnesota Extension. “Raised bed gardens.”', 'https://extension.umn.edu/planting-and-growing-guides/raised-bed-gardens'],
  umnTomato: ['University of Minnesota Extension. “Growing tomatoes in home gardens.”', 'https://extension.umn.edu/vegetables/growing-tomatoes'],
  umnHerbs: ['University of Minnesota Extension. “Growing herbs in home gardens.”', 'https://extension.umn.edu/vegetables/growing-herbs'],
  umnGarlic: ['University of Minnesota Extension. “Growing garlic in home gardens.”', 'https://extension.umn.edu/vegetables/growing-garlic'],
  clemson: ['Clemson Cooperative Extension HGIC. “Root-Knot Nematodes in the Vegetable Garden.”', 'https://hgic.clemson.edu/factsheet/root-knot-nematodes-in-the-vegetable-garden/'],
  lsu: ['LSU AgCenter. “Marigolds may help control some nematodes.”', 'https://www.lsuagcenter.com/portals/communications/news/news_archive/2009/may/get_it_growing/marigolds-may-help-control-some-nematodes']
};
const FROST_SOURCE = 'Frost dates: <a href="https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals">NOAA NCEI U.S. Climate Normals 1991–2020</a>, last spring and first fall 32°F dates at 50% probability. Zones: <a href="https://prism.oregonstate.edu/phzm">2023 USDA Plant Hardiness Zone Map ZIP listings</a> (PRISM Group, Oregon State University). Planting windows: the extension guides in <a href="/SOURCES.md">SOURCES.md</a>.';

export function loadData() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/charts/lookup.js'), 'utf8'), sandbox);
  return {
    lookup: sandbox.window.YardLookup,
    plants: require(path.join(ROOT, 'js/plants.js')).list,
    logic: require(path.join(ROOT, 'js/logic.js')),
    charts: require(path.join(ROOT, 'js/charts.js'))
  };
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- frost math ---------- */
function stateOf(name) {
  const m = /, ([A-Z]{2}) US$/.exec(name || '');
  return m ? m[1] : '';
}
function contiguousZip(zip) {
  const p = Number(zip.slice(0, 3));
  return !(p >= 6 && p <= 9) && !(p >= 967 && p <= 969) && !(p >= 995 && p <= 999);
}
/* Last-frost dates in Aug–Dec belong to the winter before; first-frost dates in Jan–Jun
   belong to the winter after. Shifting them keeps a zone-10 median from wrapping across New Year. */
function lastDay(charts, mmdd) { const n = charts.doy(mmdd); return n == null ? null : (n > 212 ? n - 365 : n); }
function firstDay(charts, mmdd) { const n = charts.doy(mmdd); return n == null ? null : (n < 182 ? n + 365 : n); }
function quantile(sorted, q) {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}
function median(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
function dayLabel(n) {
  let k = n, tag = '';
  if (k < 1) { k += 365; tag = ' (the winter before)'; }
  if (k > 365) { k -= 365; tag = ' (the next winter)'; }
  const d = new Date(2021, 0, k);
  return { text: MONTHS[d.getMonth()] + ' ' + d.getDate(), tag: tag, mmdd: String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') };
}

export function zoneStats(data, zone) {
  const { lookup, charts } = data;
  const lasts = [], firsts = [], states = {};
  Object.keys(lookup.stations).forEach((id) => {
    const row = lookup.stations[id];
    if (row[3] !== zone) return;
    const st = stateOf(row[0]);
    if (!STATES[st]) return; /* contiguous 48 states and DC only */
    const a = lastDay(charts, row[1]), b = firstDay(charts, row[2]);
    if (a == null || b == null) return;
    lasts.push(a); firsts.push(b);
    states[st] = (states[st] || 0) + 1;
  });
  let zips = 0, zipsWithFrost = 0;
  Object.keys(lookup.zips).forEach((zip) => {
    const row = lookup.zips[zip];
    if (row[0] !== zone || !contiguousZip(zip)) return;
    zips++;
    if (row.length >= 5) zipsWithFrost++;
  });
  if (!lasts.length) return { zone, n: 0, zips, zipsWithFrost };
  lasts.sort((x, y) => x - y); firsts.sort((x, y) => x - y);
  const mLast = median(lasts), mFirst = median(firsts);
  const topStates = Object.keys(states).sort((x, y) => states[y] - states[x] || x.localeCompare(y));
  return {
    zone, n: lasts.length, zips, zipsWithFrost,
    last: dayLabel(mLast), first: dayLabel(mFirst),
    /* With fewer than 10 stations, show the full spread instead of a middle half. */
    small: lasts.length < 10,
    lastLo: dayLabel(quantile(lasts, lasts.length < 10 ? 0 : 0.25)), lastHi: dayLabel(quantile(lasts, lasts.length < 10 ? 1 : 0.75)),
    firstLo: dayLabel(quantile(firsts, firsts.length < 10 ? 0 : 0.25)), firstHi: dayLabel(quantile(firsts, firsts.length < 10 ? 1 : 0.75)),
    season: mFirst - mLast,
    days: {
      last: mLast, first: mFirst,
      lastLo: quantile(lasts, lasts.length < 10 ? 0 : 0.25), lastHi: quantile(lasts, lasts.length < 10 ? 1 : 0.75),
      firstLo: quantile(firsts, firsts.length < 10 ? 0 : 0.25), firstHi: quantile(firsts, firsts.length < 10 ? 1 : 0.75)
    },
    states: topStates.map((s) => ({ code: s, name: STATES[s], n: states[s] }))
  };
}

/* ---------- planting dates, using the same offsets and date math as the planner ---------- */
function fmtDate(d) { return d ? MONTHS[d.getMonth()] + ' ' + d.getDate() : ''; }
function rangeFor(logic, frostIso, pair) {
  if (!pair) return '';
  const a = fmtDate(logic.addDays(frostIso, pair[0]));
  const b = fmtDate(logic.addDays(frostIso, pair[1]));
  if (!a || !b) return '';
  return a === b ? a : a + ' – ' + b;
}
function plantDates(logic, frostIso, p) {
  return { indoor: rangeFor(logic, frostIso, p.indoor), transplant: rangeFor(logic, frostIso, p.transplant), direct: rangeFor(logic, frostIso, p.direct) };
}
export function relText(pair, frost = 'the average last frost') {
  if (!pair) return '';
  const [a, b] = pair;
  if (a === 0 && b === 0) return 'around ' + frost;
  if (a === b && Math.abs(a) < 7) return a + (Math.abs(a) === 1 ? ' day ' : ' days ') + (a > 0 ? 'after' : 'before') + ' ' + frost;
  const w = (n) => Math.abs(n) / 7;
  if (a <= 0 && b <= 0) {
    const lo = w(b), hi = w(a);
    return (lo === hi ? hi : lo + '–' + hi) + (hi === 1 ? ' week' : ' weeks') + ' before ' + frost;
  }
  if (a >= 0 && b >= 0) {
    const lo = w(a), hi = w(b);
    return (lo === hi ? hi : lo + '–' + hi) + (hi === 1 ? ' week' : ' weeks') + ' after ' + frost;
  }
  return w(a) + ' weeks before to ' + w(b) + ' weeks after ' + frost;
}
function countText(p) {
  const sq = p.spanC * p.spanR;
  return sq > 1 ? p.perSq + ' plant per ' + sq + ' squares' : p.perSq + ' per square foot';
}
function plantText(p) {
  return [p.sun, p.daysNote, p.gridNote, p.directNote, p.indoorNote, p.transplantNote, p.fallDirectNote, p.timingNote, p.method].filter(Boolean).join(' ');
}
export function plantSources(p) {
  const t = plantText(p);
  const keys = [];
  const add = (k) => { if (keys.indexOf(k) === -1) keys.push(k); };
  if (/SDSU/.test(t)) add('sdsu');
  const csuRest = t.replace(/[^.]*mountain[^.]*\./g, '').replace(/[^.]*annuals table[^.]*\./g, '').replace(/[^.]*same CSU table[^.]*\./g, '');
  if (/CSU|GardenNotes #720/.test(csuRest)) add('csu720');
  if (/mountain/.test(t)) add('csuMtn');
  if (/annuals table|same CSU table/.test(t)) add('csuAnnual');
  if (/UF\/IFAS(?! ENY)/.test(t.replace(/UF\/IFAS ENY-056/g, ''))) add('ufLeon');
  if (/ENY-056/.test(t)) add('ufEny');
  if (/raised bed|raised-bed|less than a few hours|low-light/.test(t)) add('umnRaised');
  if (p.id === 'tomato' && /UMN/.test(t)) add('umnTomato');
  if (/herbs/.test(t) && /UMN/.test(t)) add('umnHerbs');
  if (/\(UMN\)|UMN groups|UMN:/.test([p.method, p.directNote, p.transplantNote].join(' '))) add('umnPlant');
  if (p.fallDirect || /Growing garlic|first killing frost/.test(t)) add('umnGarlic');
  if (/Clemson/.test(t)) add('clemson');
  if (/LSU/.test(t)) add('lsu');
  return keys;
}


/* ---------- frost-season charts (plain HTML and CSS, no script) ---------- */
const DIMS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const clampDay = (n) => Math.min(366, Math.max(1, n));
const pctOf = (n) => (((clampDay(n) - 1) / 365) * 100).toFixed(2);
function span(cls, a, b, extra = '') {
  const l = Number(pctOf(a)), r = Number(pctOf(b));
  return `<i class="${cls}" style="left:${l}%;width:${Math.max(0.6, r - l).toFixed(2)}%"${extra}></i>`;
}
function monthScale() {
  let day = 1;
  return MONTHS.map((m, i) => {
    const s = `<span style="left:${pctOf(day)}%;width:${((DIMS[i] / 365) * 100).toFixed(2)}%"><b class="m-long">${m}</b><b class="m-short" aria-hidden="true">${m[0]}</b></span>`;
    day += DIMS[i];
    return s;
  }).join('');
}
function bands() {
  let day = 1;
  return MONTHS.map((m, i) => {
    const s = `<i class="cal-band${i % 2 ? ' alt' : ''}" style="left:${pctOf(day)}%;width:${((DIMS[i] / 365) * 100).toFixed(2)}%"></i>`;
    day += DIMS[i];
    return s;
  }).join('');
}
function seasonChart(s) {
  const d = s.days;
  const label = `Zone ${s.zone}: median last 32°F ${s.last.text}${s.last.tag}, median first 32°F ${s.first.text}${s.first.tag}, about ${s.season} days between.`;
  return `    <figure class="season">
      <figcaption>Zone ${s.zone} frost-free stretch, from the median dates</figcaption>
      <div class="season-chart" role="img" aria-label="${esc(label)}">
        <div class="cal-months" aria-hidden="true">${monthScale()}</div>
        <div class="season-track">${bands()}${span('season-range', d.lastLo, d.lastHi)}${span('season-range', d.firstLo, d.firstHi)}${span('season-band', d.last, d.first)}<b class="season-tag" style="left:${pctOf(d.last)}%">${s.last.text}</b><b class="season-tag end" style="left:${pctOf(d.first)}%">${s.first.text}</b></div>
      </div>
      <p class="cal-legend"><span class="key"><i class="swatch band"></i>Between the median frosts, about ${s.season} days</span><span class="key"><i class="swatch range"></i>${s.small ? 'All stations' : 'Middle half of stations'}</span></p>
    </figure>`;
}
function seasonsChart(stats) {
  const rows = stats.map((s) => `        <div class="seasons-row"><a href="/zones/zone-${s.zone}.html">${s.zone}</a><div class="season-track small">${bands()}${span('season-band', s.days.last, s.days.first, ` title="Zone ${s.zone}: ${s.last.text} to ${s.first.text}"`)}</div></div>`).join('\n');
  return `    <figure class="season seasons">
      <figcaption>Median frost-free stretch by zone</figcaption>
      <div class="seasons-chart">
        <div class="seasons-row head" aria-hidden="true"><span></span><div class="cal-months">${monthScale()}</div></div>
${rows}
      </div>
      <p class="cal-legend"><span class="key"><i class="swatch band"></i>Median last 32°F to median first 32°F</span></p>
    </figure>`;
}

/* ---------- page shell, matching the existing pages ---------- */
function shell({ urlPath, title, description, body, jsonld, nav }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · Bloom &amp; Bed Garden</title>
  <meta name="description" content="${esc(description)}">
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/site.css">
  <link rel="canonical" href="${SITE}${urlPath}">
  <script src="/js/config.js"></script>
  <script>yardMeta(${JSON.stringify(urlPath)});</script>
${jsonld ? '  <script type="application/ld+json">' + JSON.stringify(jsonld).replace(/</g, '\\u003c') + '</script>\n' : ''}</head>
<body>
  <header class="site-header">
    <a class="logo" href="/index.html"><img src="/images/favicon.svg" alt="" width="32" height="32"><span>Bloom &amp; Bed Garden</span></a>
    <nav class="nav" aria-label="Main">
      <a href="/index.html">Home</a>
      <a href="/plan.html">Planner</a>
      <a href="/gallery.html">Gallery</a>
      <a href="/charts/planting-calendar.html">Charts</a>
      <a href="/guides/raised-bed.html">Guides</a>
      <a href="/about.html">About</a>
    </nav>
  </header>
  <main class="wrap prose">
${body}
  </main>
  <footer class="site-footer">
    <div class="footer-brand"><strong>Bloom &amp; Bed Garden</strong><span>A free garden bed planner, with planting dates from extension guides and NOAA normals.</span></div>
    <nav class="nav" aria-label="Footer">
      <a href="/zones/">Zones</a>
      <a href="/plants/">Plants</a>
      <a href="/about.html">About</a>
      <a href="/privacy.html">Privacy</a>
      <a href="/terms.html">Terms</a>
      <a href="/contact.html">Contact</a>
    </nav>
  </footer>
  <script src="/js/account.js"></script>
</body>
</html>
`;
}
function article(urlPath, headline, description) {
  return {
    '@context': 'https://schema.org', '@type': 'Article', headline: headline, description: description,
    dateModified: UPDATED, mainEntityOfPage: SITE + urlPath,
    author: { '@type': 'Organization', name: 'Bloom & Bed Garden', url: SITE + '/' },
    publisher: { '@type': 'Organization', name: 'Bloom & Bed Garden', url: SITE + '/' }
  };
}
function stateList(states, max) {
  const names = states.slice(0, max).map((s) => s.name);
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + (names.length > 2 ? ',' : '') + ' and ' + names[names.length - 1];
}
function zipBox() {
  return `    <form class="row" action="/charts/planting-calendar.html" method="get">
      <label>ZIP code <input name="zip" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" placeholder="10001" required></label>
      <button type="submit" class="btn">Dates for my ZIP</button>
    </form>`;
}

/* First-frost dates tagged “the next winter” (January–June) belong to the year after YEAR. */
function firstFrostIso(s) {
  const mm = Number(s.first.mmdd.slice(0, 2));
  const year = (s.first.tag && /next winter/.test(s.first.tag)) || mm <= 6 ? YEAR + 1 : YEAR;
  return year + '-' + s.first.mmdd.slice(0, 2) + '-' + s.first.mmdd.slice(2);
}

/* ---------- zone page ---------- */
function zonePage(data, s, prev, next) {
  const { plants, logic } = data;
  const urlPath = '/zones/zone-' + s.zone + '.html';
  const frostIso = YEAR + '-' + s.last.mmdd.slice(0, 2) + '-' + s.last.mmdd.slice(2);
  const title = 'Zone ' + s.zone + ' planting calendar and frost dates';
  const description = 'Zone ' + s.zone + ': median last frost ' + s.last.text + ', median first frost ' + s.first.text + ' (NOAA 1991–2020, ' + s.n + ' stations). Indoor, transplant, and direct-sow dates for 30 plants.';
  const dates = (p) => plantDates(logic, frostIso, p);
  const tomato = plants.find((p) => p.id === 'tomato');
  const peaish = plants.filter((p) => p.direct && p.direct[0] === -28);
  const earliest = peaish.length ? rangeFor(logic, frostIso, [peaish[0].direct[0], peaish[0].direct[0]]) : '';
  const peaNames = peaish.slice(0, 3).map((p) => p.name.toLowerCase());
  const pct = s.zips ? Math.round((s.zipsWithFrost / s.zips) * 100) : 0;
  const warm = s.season > 300;
  const summary = [
    `In zone ${s.zone}, the median last 32°F date across ${s.n} NOAA stations is ${s.last.text}${s.last.tag}, and the median first 32°F date is ${s.first.text}${s.first.tag}. That leaves about ${s.season} days between the two medians.`,
    `${s.small ? 'Those stations have' : 'Half of those stations have'} their last frost between ${s.lastLo.text}${s.lastLo.tag} and ${s.lastHi.text}${s.lastHi.tag}, and their first frost between ${s.firstLo.text}${s.firstLo.tag} and ${s.firstHi.text}${s.firstHi.tag}. ${s.states.length === 1 ? 'All of them are in ' + stateList(s.states, 1) : 'The states with the most of them are ' + stateList(s.states, 4)}.${s.n < 10 ? ' That is a small sample, so treat the zone median as rough and use your ZIP.' : ''}`,
    earliest ? `Counting from the median, the earliest sowings here (${peaNames.join(', ')}) start around ${earliest}, and tomatoes go out from ${dates(tomato).transplant}.` : ''
  ].filter(Boolean).join(' ');
  const rows = plants.map((p) => {
    const d = dates(p);
    let note = '';
    if (p.fallDirect) {
      const fall = rangeFor(logic, firstFrostIso(s), p.fallDirect);
      note = (fall ? 'Plant cloves ' + fall + ', counted from the median first frost. ' : '') + (p.fallDirectNote || p.timingNote || '');
    } else if (!d.indoor && !d.transplant && !d.direct) {
      note = p.timingNote || 'No frost-offset date in the sources used here.';
    }
    return `        <tr><td><a href="/plants/${p.id}.html">${esc(p.name)}</a></td><td>${esc(d.indoor || '—')}</td><td>${esc(d.transplant || '—')}</td><td>${esc(d.direct || '—')}</td></tr>` +
      (note ? `\n        <tr><td></td><td colspan="3" class="muted">${esc(note)}</td></tr>` : '');
  }).join('\n');
  const body = `    <h1>${esc(title)}</h1>
    <p class="lede">Zone ${s.zone} median last frost: <strong>${s.last.text}</strong>${s.last.tag}. Median first frost: <strong>${s.first.text}</strong>${s.first.tag}.</p>
    <p>${esc(summary)}</p>
    <p class="muted">A zone is a winter-low band from the USDA map, not a frost date. These medians are calculated here from NOAA station normals for stations matched to zone ${s.zone} in the contiguous United States. NOAA does not publish one frost date per zone. ${s.zipsWithFrost} of ${s.zips} zone ${s.zone} ZIP codes (${pct}%) have a NOAA station with both 32°F dates within 80 km. Your own ZIP gives a closer date:</p>
${zipBox()}
    <h2>Zone ${s.zone} frost dates</h2>
${seasonChart(s)}
    <table>
      <thead><tr><th></th><th>Median</th><th>${s.small ? 'All stations' : 'Middle half of stations'}</th></tr></thead>
      <tbody>
        <tr><td>Last spring 32°F</td><td>${s.last.text}${s.last.tag}</td><td>${s.lastLo.text} – ${s.lastHi.text}</td></tr>
        <tr><td>First fall 32°F</td><td>${s.first.text}${s.first.tag}</td><td>${s.firstLo.text} – ${s.firstHi.text}</td></tr>
        <tr><td>Stations</td><td colspan="2">${s.n} (${s.states.slice(0, 6).map((x) => x.code + ' ' + x.n).join(', ')}${s.states.length > 6 ? ', and ' + (s.states.length - 6) + ' more states' : ''})</td></tr>
      </tbody>
    </table>
    <h2>When to plant in zone ${s.zone}</h2>
    <p>Dates count from the ${s.last.text} median last frost, using the extension windows on each plant page. A range means the guide gave a range.${warm ? ' Here the median last and first frosts are only weeks apart in winter, so counting from a spring date is a rough guide. The Florida guide in our sources uses calendar months instead, and those are not converted to dates here.' : ''}</p>
    <table>
      <thead><tr><th>Plant</th><th>Start indoors</th><th>Set out</th><th>Direct sow</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <p class="muted">Dates are averages, not a forecast. Soil temperature is a better planting signal when you have it (CSU GardenNotes #720).</p>
    <p><a class="btn" href="/plan.html?zone=${encodeURIComponent(s.zone)}&amp;frost=${frostIso}">Plan a bed for zone ${s.zone}</a> <a class="btn secondary" href="/charts/planting-calendar.html?zone=${encodeURIComponent(s.zone)}">Zone ${s.zone} on the calendar chart</a></p>
    <p class="muted">${prev ? `<a href="/zones/zone-${prev}.html">Zone ${prev}</a> · ` : ''}<a href="/zones/">All zones</a>${next ? ` · <a href="/zones/zone-${next}.html">Zone ${next}</a>` : ''}</p>
    <p class="muted source">Sources: ${FROST_SOURCE} Updated ${UPDATED}.</p>`;
  return { path: urlPath, html: shell({ urlPath, title, description, body, jsonld: article(urlPath, title, description) }) };
}

function zonesIndex(stats) {
  const urlPath = '/zones/';
  const title = 'Planting calendars and frost dates by USDA zone';
  const description = 'Median last and first frost dates for USDA zones 3a to 10b from NOAA 1991–2020 station normals, with planting dates for 30 garden plants.';
  const rows = stats.map((s) => `        <tr><td><a href="/zones/zone-${s.zone}.html">Zone ${s.zone}</a></td><td>${s.last.text}${s.last.tag ? '*' : ''}</td><td>${s.first.text}${s.first.tag ? '*' : ''}</td><td>${s.season}</td><td>${s.n}</td></tr>`).join('\n');
  const body = `    <h1>${esc(title)}</h1>
    <p class="lede">Pick your zone for its median frost dates and a planting table for 30 plants. If you know your ZIP code, that gives a closer date.</p>
${zipBox()}
${seasonsChart(stats)}
    <table>
      <thead><tr><th>Zone</th><th>Median last 32°F</th><th>Median first 32°F</th><th>Days between</th><th>NOAA stations</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <p class="muted">* The first frost falls in the next winter. Medians are calculated here from NOAA station normals for contiguous-US stations matched to each 2023 USDA zone. A zone is a winter-low band, not a frost date.</p>
    <p><a class="btn" href="/plan.html">Open the planner</a> <a class="btn secondary" href="/plants/">Plant pages</a></p>
    <p class="muted source">Sources: ${FROST_SOURCE} Updated ${UPDATED}.</p>`;
  return { path: urlPath, file: 'zones/index.html', html: shell({ urlPath, title, description, body, jsonld: article(urlPath, title, description) }) };
}

/* ---------- plant page ---------- */
function plantPage(data, p, stats) {
  const { logic } = data;
  const urlPath = '/plants/' + p.id + '.html';
  const lower = p.name.toLowerCase();
  const title = p.name + ': spacing, plants per square foot, and when to plant';
  const timing = [];
  if (p.indoor) timing.push('start indoors ' + relText(p.indoor));
  if (p.transplant) timing.push('set out ' + relText(p.transplant));
  if (p.direct) timing.push('direct sow ' + relText(p.direct));
  if (p.fallDirect) timing.push('plant cloves ' + relText(p.fallDirect, 'the average first frost'));
  const daysWord = /^[\d–-]+$/.test(p.days) ? p.days + ' days' : p.days.replace(/^([\d–-]+) from /, '$1 days from ');
  const description = p.name + ': ' + countText(p) + ' in a square-foot bed, ' + daysWord + (timing.length ? '; ' + timing.join('; ') : '') + '. Numbers from extension guides.';
  const answer = `${p.name}: <strong>${esc(countText(p))}</strong>. Days to harvest: <strong>${esc(daysWord)}</strong>.` +
    (timing.length ? ' ' + esc(timing.join('; ').replace(/^./, (c) => c.toUpperCase())) + '.' : ' ' + esc(p.timingNote || 'The sources used here give no frost-offset date for this plant.'));
  const facts = [
    ['Per square foot', countText(p)],
    ['Squares used', String(p.spanC * p.spanR)],
    ['Spacing', p.gridNote],
    ['Days to harvest', daysWord + (p.daysNote ? '. ' + p.daysNote : '')],
    p.indoor ? ['Start indoors', relText(p.indoor) + '. ' + (p.indoorNote || '')] : null,
    p.transplant ? ['Set out', relText(p.transplant) + '. ' + (p.transplantNote || '')] : null,
    p.direct ? ['Direct sow', relText(p.direct) + '. ' + (p.directNote || '')] : null,
    p.fallDirect ? ['Plant cloves', relText(p.fallDirect, 'the average first frost') + '. ' + (p.fallDirectNote || '')] : null,
    p.timingNote ? ['Timing note', p.timingNote] : null,
    ['Light', p.sun],
    ['How to plant', p.method]
  ].filter(Boolean);
  const factRows = facts.map((f) => `        <tr><th>${esc(f[0])}</th><td>${esc(f[1].trim())}</td></tr>`).join('\n');
  const hasSpring = p.indoor || p.transplant || p.direct;
  const hasFall = !!p.fallDirect;
  const hasDates = hasSpring || hasFall;
  const cols = [p.indoor ? 'indoor' : '', p.transplant ? 'transplant' : '', p.direct ? 'direct' : ''].filter(Boolean);
  const colName = { indoor: 'Start indoors', transplant: 'Set out', direct: 'Direct sow' };
  const zoneRows = hasSpring ? stats.map((s) => {
    const iso = YEAR + '-' + s.last.mmdd.slice(0, 2) + '-' + s.last.mmdd.slice(2);
    const d = plantDates(logic, iso, p);
    return `        <tr><td><a href="/zones/zone-${s.zone}.html">${s.zone}</a></td><td>${s.last.text}</td>${cols.map((c) => '<td>' + esc(d[c]) + '</td>').join('')}</tr>`;
  }).join('\n') : '';
  const fallRows = hasFall ? stats.map((s) => {
    const fall = rangeFor(logic, firstFrostIso(s), p.fallDirect);
    return `        <tr><td><a href="/zones/zone-${s.zone}.html">${s.zone}</a></td><td>${s.first.text}${s.first.tag}</td><td>${esc(fall)}</td></tr>`;
  }).join('\n') : '';
  const srcs = plantSources(p).map((k) => `      <li>${esc(SRC[k][0])} <a href="${SRC[k][1]}">${esc(SRC[k][1].replace(/^https:\/\//, '').split('/')[0])}</a></li>`).join('\n');
  const body = `    <h1>${esc(title)}</h1>
    <p class="lede">${answer}</p>
    <table>
      <tbody>
${factRows}
      </tbody>
    </table>
${hasSpring ? `    <h2>${esc(p.name)} planting dates by zone</h2>
    <p>Counted from each zone’s median last 32°F date (NOAA 1991–2020). Your ZIP code gives a closer date on the <a href="/charts/planting-calendar.html">planting calendar</a>.</p>
    <table>
      <thead><tr><th>Zone</th><th>Median last frost</th>${cols.map((c) => '<th>' + colName[c] + '</th>').join('')}</tr></thead>
      <tbody>
${zoneRows}
      </tbody>
    </table>` : hasFall ? `    <h2>${esc(p.name)} planting dates by zone</h2>
    <p>Counted from each zone’s median first 32°F date (NOAA 1991–2020), ${esc(relText(p.fallDirect, 'the average first frost'))}. Your ZIP code gives a closer date on the <a href="/charts/what-to-plant.html">what to plant this week</a> tool.</p>
    <table>
      <thead><tr><th>Zone</th><th>Median first frost</th><th>Plant cloves</th></tr></thead>
      <tbody>
${fallRows}
      </tbody>
    </table>` : `    <p>No frost-offset dates are shown for ${esc(lower)}, because the sources used here do not give one.</p>`}
    <p><a class="btn" href="/plan.html?plant=${encodeURIComponent(p.id)}">Place ${esc(lower)} in the planner</a> <a class="btn secondary" href="/plants/">All plants</a></p>
    <p class="muted">See <a href="/guides/spacing.html">square-foot spacing</a> for how a count per square is worked out.</p>
    <h2>Sources</h2>
    <ul class="source">
${srcs}
    </ul>
    <p class="muted source">Sources: extension guides listed above and in <a href="/SOURCES.md">SOURCES.md</a>. Zone frost dates: <a href="https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals">NOAA NCEI U.S. Climate Normals 1991–2020</a>. Updated ${UPDATED}.</p>`;
  return { path: urlPath, html: shell({ urlPath, title, description, body, jsonld: article(urlPath, title, description) }) };
}

function plantsIndex(plants) {
  const urlPath = '/plants/';
  const title = 'Plant spacing and planting times for 30 garden plants';
  const description = 'Plants per square foot, days to harvest, and planting time relative to the last frost for the 30 plants in the Bloom & Bed planner.';
  const rows = plants.map((p) => {
    const when = p.indoor ? 'Indoors ' + relText(p.indoor) : p.transplant ? 'Set out ' + relText(p.transplant) : p.direct ? 'Sow ' + relText(p.direct) : p.fallDirect ? 'Plant cloves ' + relText(p.fallDirect, 'the average first frost') : 'See page';
    return `        <tr><td><a href="/plants/${p.id}.html">${esc(p.name)}</a></td><td>${esc(countText(p))}</td><td>${esc(p.days)}</td><td>${esc(when.replace(' the average last frost', ' last frost'))}</td></tr>`;
  }).join('\n');
  const body = `    <h1>${esc(title)}</h1>
    <p class="lede">Each plant page gives the square-foot count, the spacing the guides list, days to harvest, and when to plant counted from your last frost.</p>
    <table>
      <thead><tr><th>Plant</th><th>Count</th><th>Days to harvest</th><th>First step</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <p><a class="btn" href="/plan.html">Open the planner</a> <a class="btn secondary" href="/zones/">Planting calendar by zone</a></p>
    <p class="muted source">Sources: South Dakota State University, Colorado State University, UF/IFAS, University of Minnesota, Clemson, and LSU extension pages, listed in <a href="/SOURCES.md">SOURCES.md</a>. Updated ${UPDATED}.</p>`;
  return { path: urlPath, file: 'plants/index.html', html: shell({ urlPath, title, description, body, jsonld: article(urlPath, title, description) }) };
}

/* ---------- build ---------- */
export function buildAll(data = loadData()) {
  const stats = ZONES.map((z) => zoneStats(data, z));
  stats.forEach((s) => { if (!s.n) throw new Error('No contiguous-US NOAA stations for zone ' + s.zone); });
  const pages = [];
  pages.push(zonesIndex(stats));
  stats.forEach((s, i) => pages.push(zonePage(data, s, ZONES[i - 1], ZONES[i + 1])));
  pages.push(plantsIndex(data.plants));
  data.plants.forEach((p) => pages.push(plantPage(data, p, stats)));
  pages.forEach((pg) => { if (!pg.file) pg.file = pg.path.slice(1); });
  return { pages, stats };
}

export function sitemapWith(existing, pages) {
  const keep = existing.split('\n').filter((l) => !/<loc>https:\/\/bloomandbedgarden\.com\/(zones|plants)\//.test(l) && !/<\/urlset>/.test(l));
  while (keep.length && keep[keep.length - 1].trim() === '') keep.pop();
  return keep.concat(pages.map((p) => '  <url><loc>' + SITE + p.path + '</loc></url>'), '</urlset>', '').join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { pages } = buildAll();
  for (const dir of ['zones', 'plants']) {
    fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
    for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.html')) fs.unlinkSync(path.join(ROOT, dir, f));
  }
  pages.forEach((pg) => fs.writeFileSync(path.join(ROOT, pg.file), pg.html));
  const sm = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(sm, sitemapWith(fs.readFileSync(sm, 'utf8'), pages));
  console.log('wrote', pages.length, 'pages');
}
