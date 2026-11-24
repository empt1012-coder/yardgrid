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
assert.strictEqual(nyc.zone, '7b');
assert.strictEqual(nyc.last, '0330');
assert.strictEqual(nyc.first, '1120');
assert.strictEqual(nyc.station, 'USW00094728');
assert.ok(nyc.km <= 80);

const mass = charts.zipPlace(lookup, '01001');
assert.strictEqual(mass.zone, '6b');
assert.strictEqual(mass.last, '0503');
assert.strictEqual(mass.first, '1008');

assert.strictEqual(charts.zipPlace(lookup, '00000'), null);
const noFrost = charts.zipPlace(lookup, '30301');
assert.strictEqual(noFrost.zone, '8a');
assert.strictEqual(noFrost.last, undefined);

const med = charts.zoneMedian(lookup, '7b');
assert.ok(med.n > 10);
assert.strictEqual(med.last.length, 4);
assert.strictEqual(med.first.length, 4);

assert.strictEqual(charts.doy('0330'), 89);
assert.strictEqual(charts.iso('0330', 2026), '2026-03-30');
assert.strictEqual(charts.pretty('0330'), 'Mar 30');
assert.strictEqual(charts.zoneIn('7b', '5a', '9b'), true);
assert.strictEqual(charts.zoneIn('4b', '5a', '9b'), false);
assert.strictEqual(charts.medianMmdd(['0101', '0103', '0102']), '0102');

const html = charts.plantingHtml(
  [{ id: 'bean', name: 'Bush bean', direct: [0, 0] }],
  require('../js/logic.js'),
  '2026-03-30',
  '1120'
);
assert.ok(html.indexOf('Bush bean') >= 0);
assert.ok(html.indexOf('Direct sow') >= 0);
assert.ok(html.indexOf('plan.html?plant=bean&amp;frost=2026-03-30') >= 0);

console.log('charts tests passed', med.n, 'stations in 7b');

/* Zone medians: contiguous US only, and no break at New Year (same as the zone pages). */
assert.strictEqual(charts.contiguousStation('ANCHORAGE INTL AP, AK US'), false);
assert.strictEqual(charts.contiguousStation('HILO INTL AP, HI US'), false);
assert.strictEqual(charts.contiguousStation('ADDISON, AL US'), true);
['3a', '4a', '5a', '6a', '7a'].forEach(function (z) {
  const ak = Object.keys(lookup.stations).filter(function (id) { const r = lookup.stations[id]; return r[3] === z && / AK US$/.test(r[0]); }).length;
  const m = charts.zoneMedian(lookup, z);
  const all = Object.keys(lookup.stations).filter(function (id) { return lookup.stations[id][3] === z; }).length;
  if (ak) assert.ok(m.n <= all - ak, z + ' leaves out ' + ak + ' Alaska stations');
});
assert.strictEqual(charts.zoneMedian(lookup, '1a'), null, 'Alaska-only zone has no contiguous median');
assert.ok(/No contiguous-US NOAA stations/.test(charts.placeText({ zone: '1a', basis: 'zone-median' })));
const z7a = charts.zoneMedian(lookup, '7a');
assert.strictEqual(z7a.last, '0418', '7a matches the zone page');
const z10a = charts.zoneMedian(lookup, '10a');
assert.strictEqual(z10a.last, '0116');
assert.strictEqual(z10a.first, '0101');
assert.strictEqual(z10a.firstTag, 'the next winter');
assert.ok(/First 32°F Jan 1 \(the next winter\)/.test(charts.placeText(z10a)));

/* The chart and the zone pages agree for every zone. */
import(path.join(root, 'scripts/build-pages.mjs')).then(function (gen) {
  const data = gen.loadData();
  gen.ZONES.forEach(function (z) {
    const s = gen.zoneStats(data, z);
    const m = charts.zoneMedian(lookup, z);
    if (!m) {
      assert.ok(s.n > 0 && s.region === 'alaska', z + ' uses Alaska stations on the zone page');
      return;
    }
    assert.strictEqual(m.n, s.n, z + ' station count');
    assert.strictEqual(m.last, s.last.mmdd, z + ' last frost');
    assert.strictEqual(m.first, s.first.mmdd, z + ' first frost');
  });
  assert.strictEqual(charts.planYear(new Date(2026, 10, 21)), 2027, 'in November, plan next spring');
  assert.strictEqual(charts.planYear(new Date(2027, 2, 1)), 2027, 'in March, plan this spring');
  console.log('chart zone medians match the zone pages');
}).catch(function (e) { console.error(e); process.exit(1); });
