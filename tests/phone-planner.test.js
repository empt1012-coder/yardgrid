const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'plan.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'site.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'planner.js'), 'utf8');

assert.ok(html.includes('id="plantsToolbar"'), 'phone toolbar has a Plants button');
assert.ok(html.includes('id="plantsToggle"'), 'fixed Plants button remains');
assert.ok(css.includes('.plants-toolbar'), 'phone CSS shows the toolbar button');
assert.ok(css.includes('.library.open'), 'the plant sheet can open');
assert.ok(js.includes('function setPlantsOpen'), 'the sheet opener exists');
assert.ok(js.includes('if (phoneLayout()) setPlantsOpen(true);'), 'adding a bed or tapping an empty square opens the list on a phone');
assert.ok(js.includes("Tap an empty square to place"), 'tap-to-place hint remains');
console.log('phone planner markers ok');
