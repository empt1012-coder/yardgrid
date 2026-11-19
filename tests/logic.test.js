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

console.log('logic tests ok');
