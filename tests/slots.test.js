const assert = require('assert');
const slots = require('../js/save-slots.js');

const plan = { kind: 'plan', name: 'Beds' };
const arrangement = { kind: 'arrangement', name: 'Vase' };
const legacy = { name: 'Old file' };

let list = slots.applySave([], plan);
list = slots.applySave(list, arrangement);
list = slots.applySave(list, { kind: 'plan', name: 'Beds again' });
assert.strictEqual(list.length, 2);
assert.strictEqual(list.filter(function (row) { return row.kind === 'plan'; }).length, 1);
assert.strictEqual(list.filter(function (row) { return row.kind === 'plan'; })[0].name, 'Beds again');

list = slots.applySave([legacy, plan], arrangement);
assert.strictEqual(list.length, 3);
assert.ok(list.some(function (row) { return row.name === 'Old file' && !row.kind; }));
assert.strictEqual(slots.label(legacy), 'Earlier save: Old file');
assert.strictEqual(slots.label(arrangement), 'Arrangement: Vase');
console.log('slot tests passed');

assert.strictEqual(slots.plantCount({ plants: [{}, {}, {}], pieces: [] }), 3);
assert.strictEqual(slots.plantCount({ plants: [{}, {}], pieces: [{}] }), 3);
assert.strictEqual(slots.plantCount({}), 0);
assert.strictEqual(slots.shouldShowKeepPanel({ plantCount: 2, editMs: 1000 }), false);
assert.strictEqual(slots.shouldShowKeepPanel({ plantCount: 3 }), true);
assert.strictEqual(slots.shouldShowKeepPanel({ plantCount: 1, editMs: 45000 }), true);
assert.strictEqual(slots.shouldShowKeepPanel({ plantCount: 5, viewOnly: true }), false);
assert.strictEqual(slots.shouldShowKeepPanel({ plantCount: 5, demo: true }), false);
assert.strictEqual(slots.shouldShowOpenSaved({ savedCount: 0 }), false);
assert.strictEqual(slots.shouldShowOpenSaved({ savedCount: 1 }), true);
console.log('keep-panel rules passed');
