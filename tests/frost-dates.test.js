const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const charts = require('../js/charts.js');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'data/charts/lookup.js'), 'utf8'), sandbox);
const lookup = sandbox.window.YardLookup;

const nyc = charts.zipPlace(lookup, '10001');
assert.strictEqual(charts.seasonDays(nyc.last, nyc.first), 235);
assert.strictEqual(charts.frostSpan(nyc.last, nyc.first).lastText, 'Mar 30');
assert.strictEqual(charts.frostSpan(nyc.last, nyc.first).firstText, 'Nov 20');
assert.strictEqual(charts.frostSpan(nyc.last, nyc.first).firstTag, '');

const mass = charts.zipPlace(lookup, '01001');
assert.strictEqual(charts.seasonDays(mass.last, mass.first), 158);

/* A south Florida ZIP whose first 32°F date falls in the next winter. */
const miami = charts.zipPlace(lookup, '33101');
assert.ok(miami && miami.last && miami.first, '33101 has frost dates');
const span = charts.frostSpan(miami.last, miami.first);
assert.ok(span.days > 300, 'warm-zone season is long');
assert.ok(span.days < 366, 'season stays within a year');
if (charts.doy(miami.first) < 182) {
  assert.strictEqual(span.firstTag, 'the next winter');
}

assert.strictEqual(charts.seasonDays('0503', '1008'), 158);
assert.strictEqual(charts.seasonDays('0330', '1120'), 235);
assert.strictEqual(charts.frostSpan('0118', '0115').days, 362);
assert.strictEqual(charts.frostSpan('0118', '0115').firstTag, 'the next winter');
assert.strictEqual(charts.seasonDays('0000', '1120'), null);

const html = fs.readFileSync(path.join(root, 'tools/frost-dates.html'), 'utf8');
assert.ok(html.includes('<title>Frost dates by ZIP code · Bloom &amp; Bed Garden</title>'));
const desc = html.match(/<meta name="description" content="([^"]+)">/)[1];
assert.ok(/frost dates by ZIP code/i.test(desc), 'meta targets frost dates by ZIP code');
assert.ok(desc.length <= 160, 'meta stays near 155 characters: ' + desc.length);
assert.ok(html.includes('<h1>Frost dates by ZIP code</h1>'));
assert.ok(html.includes('50% probability'), 'explains the 50% probability dates');
assert.ok(html.includes('not a forecast'), 'says the dates are not a forecast');
assert.ok(html.includes('href="../charts/what-to-plant.html"'), 'links to what-to-plant');
assert.ok(html.includes('href="../charts/planting-calendar.html"'), 'links to the planting calendar');
assert.ok(html.includes('href="../plan.html"'), 'links to the planner');
assert.ok(html.includes('data/charts/lookup.js') && html.includes('js/charts.js'), 'uses the NOAA lookup');
assert.ok(html.includes('ncei.noaa.gov'), 'cites NOAA');
assert.ok(!/plus\.html/i.test(html.split('<footer')[0]), 'tool copy does not pitch Plus');

['index.html', 'guides/frost-date.html', 'charts/planting-calendar.html'].forEach(function (rel) {
  const page = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(page.includes('frost-dates.html'), rel + ' links to the frost dates tool');
});

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('<loc>https://bloomandbedgarden.com/tools/frost-dates.html</loc>'));

console.log('frost-dates tests passed');
