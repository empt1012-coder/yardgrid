/* Zone and plant pages built by scripts/build-pages.mjs. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

(async function () {
  const gen = await import(path.join(root, 'scripts/build-pages.mjs'));
  const plants = require('../js/plants.js').list;
  assert.strictEqual(plants.length, 30, 'plant library stays at 30');

  const { pages, stats } = gen.buildAll();
  assert.strictEqual(pages.length, 16 + 1 + 30 + 1, '16 zones, 30 plants, two indexes');

  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  pages.forEach(function (pg) {
    const file = path.join(root, pg.file);
    assert.ok(fs.existsSync(file), pg.file + ' exists');
    const html = fs.readFileSync(file, 'utf8');
    assert.strictEqual(html, pg.html, pg.file + ' matches the generator (run node scripts/build-pages.mjs)');
    assert.ok(html.includes('yardMeta(' + JSON.stringify(pg.path) + ')'), pg.file + ' sets its canonical');
    assert.ok(html.includes('src="/js/config.js"'), pg.file + ' loads config.js');
    assert.ok(html.includes('class="muted source">Sources:'), pg.file + ' has a source line');
    assert.ok(/href="\/plan\.html[?"]/.test(html), pg.file + ' links to the planner');
    assert.ok(html.includes('application/ld+json'), pg.file + ' has JSON-LD');
    assert.ok(!/undefined|NaN|null/.test(html.replace(/<script type="application\/ld\+json">[^<]*<\/script>/, '')), pg.file + ' has no empty values');
    assert.ok(!/plus\.html/i.test(html), pg.file + ' has no Plus pitch');
    assert.ok(sitemap.includes('<loc>https://bloomandbedgarden.com' + pg.path + '</loc>'), pg.path + ' is in sitemap.xml');
  });

  stats.forEach(function (s) {
    assert.ok(s.n > 0, s.zone + ' has stations');
    assert.ok(/^[A-Z][a-z]{2} \d{1,2}$/.test(s.last.text) && /^[A-Z][a-z]{2} \d{1,2}$/.test(s.first.text), s.zone + ' frost dates');
    const html = fs.readFileSync(path.join(root, 'zones/zone-' + s.zone + '.html'), 'utf8');
    assert.ok(html.includes('median last frost: <strong>' + s.last.text + '</strong>'), s.zone + ' shows its last frost');
    assert.ok(html.includes('NOAA NCEI U.S. Climate Normals 1991–2020'), s.zone + ' NOAA source line');
    assert.ok(html.includes('action="/charts/planting-calendar.html"'), s.zone + ' ZIP box');
    assert.ok(html.includes('Plan a bed for zone ' + s.zone), s.zone + ' planner link');
    plants.forEach(function (p) { assert.ok(html.includes('/plants/' + p.id + '.html'), s.zone + ' lists ' + p.id); });
  });
  /* Season order holds from cold to warm zones. */
  for (let i = 1; i < stats.length; i++) assert.ok(stats[i].season >= stats[i - 1].season, 'season grows ' + stats[i].zone);

  /* Zone 7a dates match the stations' own median, using the planner's date math. */
  const z7 = stats.find(function (s) { return s.zone === '7a'; });
  assert.strictEqual(z7.last.text, 'Apr 18');
  const tomato = fs.readFileSync(path.join(root, 'zones/zone-7a.html'), 'utf8');
  assert.ok(tomato.includes('<a href="/plants/tomato.html">Tomato</a></td><td>Mar 14 – Mar 28</td><td>May 2</td>'), '7a tomato row from the CSU offsets');

  plants.forEach(function (p) {
    const html = fs.readFileSync(path.join(root, 'plants/' + p.id + '.html'), 'utf8');
    assert.ok(html.includes('<strong>' + (p.spanC * p.spanR > 1 ? p.perSq + ' plant per ' + (p.spanC * p.spanR) + ' squares' : p.perSq + ' per square foot') + '</strong>'), p.id + ' count');
    assert.ok(html.includes('href="/plan.html?plant=' + p.id + '"'), p.id + ' planner link');
    assert.ok(gen.plantSources(p).length > 0, p.id + ' has a named source');
    assert.ok(/<ul class="source">\s*<li>/.test(html), p.id + ' source list');
    if (p.direct) assert.ok(html.includes(gen.relText(p.direct)), p.id + ' sowing window');
  });
  assert.strictEqual(gen.relText([-28, -14]), '2–4 weeks before the average last frost');
  assert.strictEqual(gen.relText([14, 14]), '2 weeks after the average last frost');

  ['index.html', 'charts/planting-calendar.html', 'guides/frost-date.html'].forEach(function (f) {
    assert.ok(fs.readFileSync(path.join(root, f), 'utf8').includes('zones/"'), f + ' links to /zones/');
  });
  console.log('pages tests passed', pages.length, 'pages');
})().catch(function (e) { console.error(e); process.exit(1); });
