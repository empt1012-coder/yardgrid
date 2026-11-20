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
