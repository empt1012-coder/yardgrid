const plants = require('../js/plants.js');
const logic = require('../js/logic.js');
const assert = require('assert');

assert.strictEqual(plants.list.length, 30);
const ids = plants.list.map(function (p) { return p.id; });
assert.strictEqual(new Set(ids).size, 30);
plants.list.forEach(function (p) {
  assert.ok(p.perSq >= 1, p.id);
  assert.ok(p.spanC >= 1 && p.spanR >= 1, p.id);
  assert.ok(p.days && p.gridNote && p.daysNote, p.id);
});

const byId = plants.byId;
const bed = { id: 'b', x: 0, y: 0, w: 4, h: 8 };
assert.strictEqual(logic.canPlace(bed, [], byId, 'tomato', 3, 0, null), false);
assert.strictEqual(logic.canPlace(bed, [], byId, 'tomato', 2, 1, null), true);
const plantings = [
  { id: 'a', bedId: 'b', plantId: 'tomato', c: 2, r: 1 },
  { id: 'm', bedId: 'b', plantId: 'marigold', c: 2, r: 0 },
  { id: 'bas', bedId: 'b', plantId: 'basil', c: 0, r: 0 }
];
assert.strictEqual(logic.canPlace(bed, plantings, byId, 'pepper', 2, 1, null), false);
assert.strictEqual(logic.canPlace(bed, plantings, byId, 'pepper', 2, 1, 'a'), true);

const notes = logic.neighborNotes('b', plantings, byId);
assert.strictEqual(notes.length, 1);
assert.ok(notes[0].text.indexOf('anecdotal') !== -1);
assert.strictEqual(logic.pairNote('basil', 'tomato'), null);

const beanNotes = logic.neighborNotes('b', [
  { id: '1', bedId: 'b', plantId: 'bean', c: 0, r: 0 },
  { id: '2', bedId: 'b', plantId: 'carrot', c: 1, r: 0 }
], byId);
assert.strictEqual(beanNotes.length, 1);
assert.ok(beanNotes[0].text.indexOf('end of the season') !== -1);

const far = logic.neighborNotes('b', [
  { id: '1', bedId: 'b', plantId: 'marigold', c: 0, r: 0 },
  { id: '2', bedId: 'b', plantId: 'tomato', c: 0, r: 2 }
], byId);
assert.strictEqual(far.length, 0);

const shop = logic.shopping([
  { id: '1', bedId: 'b', plantId: 'carrot', c: 0, r: 0 },
  { id: '2', bedId: 'b', plantId: 'carrot', c: 1, r: 0 },
  { id: '3', bedId: 'b', plantId: 'tomato', c: 2, r: 1 }
], byId);
const carrot = shop.filter(function (s) { return s.id === 'carrot'; })[0];
const tomato = shop.filter(function (s) { return s.id === 'tomato'; })[0];
assert.strictEqual(carrot.plants, 32);
assert.strictEqual(tomato.plants, 1);
assert.strictEqual(tomato.squares, 2);

assert.strictEqual(logic.scaleFactor(3, 6), 2);
assert.strictEqual(logic.scaleFactor(0, 6), null);
assert.ok(Math.abs(logic.lineLength(0, 0, 3, 4) - 5) < 1e-9);

const rows = logic.calendarRows([{ plantId: 'radish' }, { plantId: 'tomato' }], byId, '2026-05-15');
assert.strictEqual(rows[0].direct, 'Apr 17 – May 1');
assert.strictEqual(rows[1].transplant, 'May 29');
assert.strictEqual(rows[1].indoor, 'Apr 10 – Apr 24');
assert.strictEqual(logic.calendarRows([{ plantId: 'garlic' }], byId, '2026-05-15')[0].direct, '');

const d = logic.addDays('2026-01-31', 1);
assert.strictEqual(d.getMonth(), 1);
assert.strictEqual(d.getDate(), 1);
assert.strictEqual(logic.parseISO('2026-02-31'), null);

/* Gardens from share links, files, and storage are cleaned before the board writes them into HTML. */
const knownPlants = {};
Object.keys(byId).forEach(function (k) { knownPlants[k] = true; });
const evil = '"><img src=x onerror=alert(1)>';
const g = logic.cleanGarden({
  name: 'Front <b>bed</b>', frost: '2027-04-18', ppm: '1e9', panX: 'x', opacity: 5, mode: 'place',
  photo: { x: 1, y: 2, wFt: 18, hFt: 12, natW: 1600, natH: 1067, onload: 'x' },
  beds: [{ id: 'b1', name: 'Bed 1', x: 1, y: 1, w: 4, h: 8 }, { id: evil, name: 'bad', x: 0, y: 0, w: 4, h: 4 }, { id: 'b1', w: 2, h: 2 }],
  plants: [{ id: 'p1', bedId: 'b1', plantId: 'tomato', c: 0, r: 0 }, { id: 'p2', bedId: 'b1', plantId: evil, c: 1, r: 1 }, { id: 'p3', bedId: evil, plantId: 'basil', c: 1, r: 1 }],
  stamps: [{ id: 's1', name: 'Rose', w: 360, h: 300 }, { id: evil }],
  pieces: [
    { id: 'k1', kind: 'stamp', stampId: 's1', x: 1, y: 1, wFt: 2, hFt: 2, rot: '45deg);background:url(x)', flip: 'yes', z: 3 },
    { id: 'k2', kind: 'icon', plantId: 'basil', x: 0, y: 0, wFt: 1, hFt: 1 },
    { id: 'k3', kind: '<script>', libraryId: 'aloe' },
    { id: evil, kind: 'icon', plantId: 'basil' }
  ],
  extra: '<script>'
}, knownPlants, { aloe: true });
assert.strictEqual(g.name, 'Front <b>bed</b>', 'names are kept and escaped where shown');
assert.strictEqual(g.frost, '2027-04-18');
assert.strictEqual(g.ppm, 200);
assert.strictEqual(g.panX, 24);
assert.strictEqual(g.opacity, 1);
assert.strictEqual(g.mode, 'place');
assert.deepStrictEqual(Object.keys(g.photo).sort(), ['hFt', 'natH', 'natW', 'wFt', 'x', 'y']);
assert.deepStrictEqual(g.beds.map(function (b) { return b.id; }), ['b1']);
assert.deepStrictEqual(g.plants.map(function (p) { return p.id; }), ['p1']);
assert.deepStrictEqual(g.stamps.map(function (s) { return s.id; }), ['s1']);
assert.deepStrictEqual(g.pieces.map(function (p) { return p.id + ':' + p.kind; }), ['k1:stamp', 'k2:icon', 'k3:stamp']);
assert.strictEqual(g.pieces[0].rot, 0, 'rotation must be a number');
assert.strictEqual(g.pieces[0].flip, false);
assert.strictEqual(g.pieces[2].stampId, null);
assert.strictEqual(g.extra, undefined);
assert.ok(JSON.stringify(g).indexOf('onerror') === -1, 'nothing from the bad ids survives');
assert.deepStrictEqual(logic.cleanGarden(null).beds, []);
assert.strictEqual(logic.cleanGarden({ frost: '2027-02-31' }).frost, '');

console.log('logic tests ok');
