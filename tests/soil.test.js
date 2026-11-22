const assert = require('assert');
const fs = require('fs');
const path = require('path');
const soil = require('../js/soil.js');

assert.strictEqual(soil.toFeet(12, 'in'), 1);
assert.strictEqual(soil.toFeet(8, 'ft'), 8);
assert.strictEqual(soil.toFeet(8, 'feet'), 8);
assert.strictEqual(soil.toFeet(6, 'inches'), 0.5);
assert.strictEqual(soil.toFeet('nope', 'ft'), null);
assert.strictEqual(soil.toFeet(4, 'cm'), null);

const classic = {
  shape: 'rect',
  length: 8, lengthUnit: 'ft',
  width: 4, widthUnit: 'ft',
  depth: 12, depthUnit: 'in',
  count: 1
};
const classicCuFt = soil.cubicFeetForBed(classic);
assert.strictEqual(classicCuFt, 32);

const allInches = soil.cubicFeetForBed({
  shape: 'rect',
  length: 96, lengthUnit: 'in',
  width: 48, widthUnit: 'in',
  depth: 12, depthUnit: 'in',
  count: 1
});
assert.strictEqual(allInches, 32);

const depthFeet = soil.cubicFeetForBed({
  shape: 'rect',
  length: 8, lengthUnit: 'ft',
  width: 4, widthUnit: 'ft',
  depth: 1, depthUnit: 'ft',
  count: 1
});
assert.strictEqual(depthFeet, 32);

const tenInches = soil.cubicFeetForBed({
  shape: 'rect',
  length: 8, lengthUnit: 'ft',
  width: 4, widthUnit: 'ft',
  depth: 10, depthUnit: 'in',
  count: 1
});
assert.ok(Math.abs(tenInches - (8 * 4 * 10 / 12)) < 1e-10);

assert.strictEqual(soil.cubicFeetForBed({
  shape: 'rect',
  length: 8, lengthUnit: 'ft',
  width: 4, widthUnit: 'ft',
  depth: 12, depthUnit: 'in',
  count: 2
}), 64);

const roundBed = soil.cubicFeetForBed({
  shape: 'round',
  diameter: 4, diameterUnit: 'ft',
  depth: 12, depthUnit: 'in',
  count: 1
});
assert.ok(Math.abs(roundBed - (Math.PI * 4)) < 1e-10);

assert.strictEqual(soil.cubicFeetForBed({
  shape: 'rect', length: 0, lengthUnit: 'ft', width: 4, widthUnit: 'ft', depth: 12, depthUnit: 'in', count: 1
}), null);
assert.strictEqual(soil.cubicFeetForBed({
  shape: 'rect', length: 8, lengthUnit: 'ft', width: 4, widthUnit: 'ft', depth: 12, depthUnit: 'in', count: 0
}), null);
assert.strictEqual(soil.cubicFeetForBed({
  shape: 'rect', length: -8, lengthUnit: 'ft', width: 4, widthUnit: 'ft', depth: 12, depthUnit: 'in', count: 1
}), null);
assert.strictEqual(soil.cubicFeetForBed(null), null);

assert.strictEqual(soil.bagsNeeded(32, 1), 32);
assert.strictEqual(soil.bagsNeeded(32, 1.5), 22);
assert.strictEqual(soil.bagsNeeded(32, 2), 16);
assert.strictEqual(soil.bagsNeeded(32, 2.5), 13);
assert.strictEqual(soil.bagsNeeded(3, 1.5), 2);
assert.strictEqual(soil.bagsNeeded(0, 1), null);
assert.strictEqual(soil.bagsNeeded(32, 0), null);

const result = soil.calculate(classic);
assert.strictEqual(result.cubicFeet, 32);
assert.ok(Math.abs(result.cubicYards - 32 / 27) < 1e-10);
assert.deepStrictEqual(result.bags, { '1': 32, '1.5': 22, '2': 16, '2.5': 13 });
assert.ok(Math.abs(result.mix.topsoil - 19.2) < 1e-10);
assert.ok(Math.abs(result.mix.compost - 9.6) < 1e-10);
assert.ok(Math.abs(result.mix.aeration - 3.2) < 1e-10);

const twoSizes = soil.calculate([
  classic,
  { shape: 'rect', length: 4, lengthUnit: 'ft', width: 4, widthUnit: 'ft', depth: 12, depthUnit: 'in', count: 1 }
]);
assert.strictEqual(twoSizes.cubicFeet, 48);
assert.strictEqual(twoSizes.bags['2'], 24);

assert.strictEqual(soil.calculate([classic, { shape: 'rect', length: 0, lengthUnit: 'ft', width: 4, widthUnit: 'ft', depth: 12, depthUnit: 'in', count: 1 }]), null);

assert.strictEqual(soil.formatVolume(32), '32');
assert.strictEqual(soil.formatVolume(32 / 27), '1.19');
assert.strictEqual(soil.formatVolume(19.2), '19.2');
assert.strictEqual(soil.formatVolume(3.2), '3.2');
assert.strictEqual(soil.formatVolume(8 * 4 * 10 / 12), '26.67');
assert.strictEqual(soil.formatVolume(0), '0');

const html = fs.readFileSync(path.join(__dirname, '..', 'tools/soil-calculator.html'), 'utf8');
assert.ok(html.includes('yardMeta("/tools/soil-calculator.html")'));
assert.ok(html.includes('href="../plan.html"'));
assert.ok(html.includes('iowa.edu') || html.includes('iastate.edu'));
assert.ok(html.includes('extension.umn.edu'));
assert.ok(/60%\s+topsoil,\s+30%\s+compost,\s+and\s+10%\s+aeration/i.test(html));
assert.ok(/common rule of thumb/i.test(html));
assert.ok(!/plus\.html/i.test(html.replace(/href="\.\.\/plus\.html">Plus<\/a>/, '')));
assert.ok(!/<img(?![^>]*favicon)/.test(html), 'no new images besides the logo');
assert.ok(html.includes('32 cubic feet'));
assert.ok(html.includes('1.19 cubic yards'));

console.log('soil tests passed');
