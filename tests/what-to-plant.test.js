/* What to plant this week: frost windows, late-November off-season, garlic fall offset. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const plants = require('../js/plants.js');
const logic = require('../js/logic.js');
const charts = require('../js/charts.js');
const week = require('../js/what-to-plant.js');

function loadLookup() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/charts/lookup.js'), 'utf8'), sandbox);
  return sandbox.window.YardLookup;
}

const nov22 = new Date(2026, 10, 22);
assert.strictEqual(week.startOfWeek(nov22).toDateString(), new Date(2026, 10, 22).toDateString());
assert.strictEqual(week.endOfWeek(week.startOfWeek(nov22)).toDateString(), new Date(2026, 10, 28).toDateString());
assert.strictEqual(charts.planYear(nov22), 2027);

const garlic = plants.byId.garlic;
assert.ok(!garlic.direct && !garlic.indoor && !garlic.transplant, 'garlic has no last-spring-frost offset');
assert.deepStrictEqual(garlic.fallDirect, [7, 14], 'UMN: 1–2 weeks after the first killing frost');
assert.ok(/UMN/.test(garlic.fallDirectNote), 'garlic fall window names UMN');
assert.strictEqual(logic.calendarRows([{ plantId: 'garlic' }], plants.byId, '2026-05-15')[0].direct, '');

function names(list) { return list.map(function (w) { return w.id; }); }

/* Zone 8b: first frost Nov 12, garlic Nov 19–26 overlaps the week of Nov 22. */
const z8b = { zone: '8b', last: '0319', first: '1112', basis: 'zone-median', n: 1 };
const r8 = week.report(plants.list, logic, charts, z8b, nov22);
assert.strictEqual(logic.fmt(r8.weekStart), 'Nov 22');
assert.strictEqual(logic.fmt(r8.weekEnd), 'Nov 28');
assert.deepStrictEqual(names(r8.thisWeek.fallDirect), ['garlic']);
assert.strictEqual(week.fmtRange(logic, r8.thisWeek.fallDirect[0]), 'Nov 19 – Nov 26');
assert.strictEqual(r8.springThis, 0);
assert.ok(r8.planning);
assert.ok(r8.later.some(function (w) { return w.kind === 'indoor'; }), '8b still lists upcoming indoor starts');

/* Zone 9a: first frost Nov 25, garlic Dec 2–9 is in the next few weeks. */
const z9a = { zone: '9a', last: '0304', first: '1125', basis: 'zone-median', n: 1 };
const r9 = week.report(plants.list, logic, charts, z9a, nov22);
assert.strictEqual(r9.thisWeek.fallDirect.length, 0);
assert.deepStrictEqual(names(r9.coming.fallDirect), ['garlic']);
assert.strictEqual(week.fmtRange(logic, r9.coming.fallDirect[0]), 'Dec 2 – Dec 9');

/* Zone 6b in late November: garlic already planted, indoor starts still weeks out. */
const z6b = { zone: '6b', last: '0425', first: '1020', basis: 'zone-median', n: 1 };
const r6 = week.report(plants.list, logic, charts, z6b, nov22);
assert.ok(r6.offSeason);
assert.ok(r6.planning);
assert.strictEqual(r6.thisCount, 0);
assert.ok(r6.later.some(function (w) { return w.id === 'broccoli' && w.kind === 'indoor'; }));
assert.ok(r6.later.every(function (w) { return w.start > r6.comingEnd; }));
const html6 = week.reportHtml(r6, logic, charts, { zone: '6b' });
assert.ok(/Nothing in the plant list falls in this week/.test(html6));
assert.ok(/sketch next season’s beds/.test(html6));
assert.ok(html6.includes('href="../plants/broccoli.html"'));
assert.ok(html6.includes('../plan.html?zone=6b&amp;frost=2027-04-25') || html6.includes('../plan.html?zone=6b&frost=2027-04-25'));
assert.ok(html6.includes('Looking ahead'));

/* Tampa ZIP 33602 (zone 10a): indoor starts in December, garlic in January. */
const lookup = loadLookup();
const tampa = charts.zipPlace(lookup, '33602');
assert.strictEqual(tampa.zone, '10a');
assert.strictEqual(tampa.last, '0120');
assert.strictEqual(tampa.first, '0112');
const rt = week.report(plants.list, logic, charts, tampa, nov22);
assert.ok(rt.thisWeek.indoor.length + rt.coming.indoor.length > 0, 'Tampa indoor starts are underway or coming in late November');
assert.ok(rt.thisWeek.indoor.some(function (w) { return w.id === 'broccoli'; }) || rt.coming.indoor.some(function (w) { return w.id === 'broccoli'; }), 'Tampa broccoli indoor window overlaps late November');
assert.ok(rt.coming.indoor.some(function (w) { return w.id === 'tomato'; }) || rt.thisWeek.indoor.some(function (w) { return w.id === 'tomato'; }) || rt.later.some(function (w) { return w.id === 'tomato' && w.kind === 'indoor'; }), 'Tampa tomato indoor starts are on the calendar');
assert.ok(rt.coming.fallDirect.some(function (w) { return w.id === 'garlic'; }) || rt.later.some(function (w) { return w.id === 'garlic' && w.kind === 'fallDirect'; }), 'Tampa garlic is after the first January frost');
const htmlT = week.reportHtml(rt, logic, charts, { zone: tampa.zone });
assert.ok(htmlT.includes('../plants/tomato.html'));
assert.ok(htmlT.includes('../plants/garlic.html'));
assert.ok(/UMN/.test(htmlT));

/* A mid-spring week still lists set-out and direct-sow work. */
const may10 = new Date(2027, 4, 10);
const rSpring = week.report(plants.list, logic, charts, z6b, may10);
assert.ok(rSpring.thisCount > 0);
assert.ok(rSpring.thisWeek.transplant.length + rSpring.thisWeek.direct.length > 0);
assert.strictEqual(rSpring.planning, false);
const htmlS = week.reportHtml(rSpring, logic, charts, { zone: '6b' });
assert.ok(htmlS.includes('Use these dates in the planner'));
assert.ok(!/Nothing in the plant list falls in this week/.test(htmlS));

const noFrost = week.report(plants.list, logic, charts, { zone: '1a', basis: 'zone-median' }, nov22);
assert.strictEqual(noFrost.hasFrost, false);
assert.ok(/No frost date/.test(week.reportHtml(noFrost, logic, charts, {})));

const page = fs.readFileSync(path.join(root, 'charts/what-to-plant.html'), 'utf8');
assert.ok(page.includes('yardMeta("/charts/what-to-plant.html")'));
assert.ok(page.includes('js/what-to-plant.js'));
assert.ok(page.includes('data/charts/lookup.js'));

console.log('what-to-plant tests passed');
