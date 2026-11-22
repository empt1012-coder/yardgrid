/* Styles stay self-hosted: the CSP allows fonts and styles only from this site. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/site.css'), 'utf8');

(css.match(/url\(([^)]+)\)/g) || []).forEach(function (u) {
  const v = u.slice(4, -1).replace(/["']/g, '');
  if (v.startsWith('data:')) return;
  assert.ok(!/^(https?:)?\/\//.test(v), 'css url is local: ' + v);
  assert.ok(fs.existsSync(path.join(root, 'css', v)), 'css url exists: ' + v);
});
assert.ok(!/@import/.test(css), 'no @import');
['fonts/inter-var-latin.woff2', 'fonts/fraunces-var-latin.woff2', 'fonts/OFL-Inter.txt', 'fonts/OFL-Fraunces.txt'].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(root, f)), f + ' exists');
});
assert.ok(/SIL Open Font License/.test(fs.readFileSync(path.join(root, 'fonts/OFL-Inter.txt'), 'utf8')), 'Inter license text');
assert.ok(/font-display: swap/.test(css), 'fonts swap in');

/* Every page uses the shared header, with a text logo and a labelled nav. */
function pages(dir) {
  return fs.readdirSync(path.join(root, dir)).filter(function (f) { return f.endsWith('.html'); }).map(function (f) { return path.join(dir, f); });
}
const all = pages('.').concat(pages('guides'), pages('charts'), pages('zones'), pages('plants'));
all.forEach(function (rel) {
  const s = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(/<link rel="stylesheet" href="[./]*\/?css\/site\.css">/.test(s), rel + ' loads site.css');
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|cdn\./.test(s), rel + ' loads nothing from a CDN');
  assert.ok(s.includes('<nav class="nav" aria-label="Main">'), rel + ' has the main nav');
  assert.ok(s.includes('<span>Bloom &amp; Bed Garden</span></a>'), rel + ' has the text logo');
  assert.ok((s.match(/aria-current="page"/g) || []).length <= 3, rel + ' marks at most one page per nav');
});

/* The planting chart draws month bands, both frost lines, and a legend. */
const charts = require('../js/charts.js');
const html = charts.plantingHtml(
  [{ id: 'tomato', name: 'Tomato', indoor: [-35, -21], transplant: [14, 14] }],
  require('../js/logic.js'), '2027-04-18', '1023'
);
assert.strictEqual((html.match(/class="cal-band/g) || []).length, 12, '12 month bands');
assert.ok(html.includes('frost-line last') && html.includes('frost-line first'), 'both frost lines');
assert.ok(html.includes('Last 32°F, Apr 18') && html.includes('First 32°F, Oct 23'), 'legend names the frost dates');
assert.ok(/class="bar indoor" title="Tomato: start indoors [^"]+"/.test(html), 'bars carry a tooltip');
assert.ok(html.includes('class="bar transplant"'), 'set-out bar');
console.log('style tests passed', all.length, 'pages');
