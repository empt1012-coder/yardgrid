/* Site-wide markup checks: links, titles, descriptions, canonicals, alt text, placeholders, headers. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === '.git' || e.name === 'node_modules') return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  });
  return out;
}
const pages = walk(root, []);
const ids = {};
pages.forEach(function (f) {
  const s = fs.readFileSync(f, 'utf8');
  ids[f] = new Set((s.match(/\sid="[^"]+"/g) || []).map(function (m) { return m.slice(5, -1); }));
});
const titles = {};
const descs = {};
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
pages.forEach(function (f) {
  const rel = path.relative(root, f).split(path.sep).join('/');
  const s = fs.readFileSync(f, 'utf8');
  const title = (s.match(/<title>([^<]*)<\/title>/g) || []);
  assert.strictEqual(title.length, 1, rel + ' has one title');
  assert.ok(!titles[title[0]], rel + ' title is not shared with ' + titles[title[0]]);
  titles[title[0]] = rel;
  const desc = s.match(/<meta name="description" content="([^"]+)">/g) || [];
  assert.strictEqual(desc.length, 1, rel + ' has one meta description');
  assert.ok(!descs[desc[0]], rel + ' description is not shared with ' + descs[desc[0]]);
  descs[desc[0]] = rel;
  assert.strictEqual((s.match(/<h1[\s>]/g) || []).length, 1, rel + ' has one h1');
  assert.ok(/<html lang="en">/.test(s) && s.includes('name="viewport"'), rel + ' lang and viewport');
  const meta = /yardMeta\("([^"]+)"\)/.exec(s);
  assert.ok(meta, rel + ' calls yardMeta');
  assert.ok(s.includes('<link rel="canonical" href="https://bloomandbedgarden.com' + meta[1] + '">'), rel + ' has a canonical in the HTML');
  if (rel !== 'plan.html') assert.ok(sitemap.includes('<loc>https://bloomandbedgarden.com' + meta[1] + '</loc>') || rel === 'plan.html', rel + ' is in sitemap.xml');
  (s.match(/<img\b[^>]*>/g) || []).forEach(function (img) { assert.ok(/\salt="/.test(img), rel + ' img has alt: ' + img.slice(0, 60)); });
  assert.ok(!/href="#"/.test(s), rel + ' has no empty # links');
  assert.ok(!/example\.com/.test(s), rel + ' has no placeholder email');
  assert.ok(!/affiliate/i.test(s), rel + ' has no affiliate links');
  assert.ok(!/href="http:\/\//.test(s), rel + ' links use https');
  const re = /(?:href|src|action)="([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url) || url.indexOf("'") !== -1) continue;
    const parts = url.split('#');
    const clean = parts[0].split('?')[0];
    let target = clean === '' ? f : clean.charAt(0) === '/' ? path.join(root, clean) : path.join(path.dirname(f), clean);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    assert.ok(fs.existsSync(target), rel + ' link resolves: ' + url);
    if (parts[1] && target.endsWith('.html')) assert.ok(ids[target] && ids[target].has(parts[1]), rel + ' anchor exists: ' + url);
  }
});

const contact = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
assert.ok(contact.includes('href="mailto:hello@bloomandbedgarden.com"'), 'contact email');
const about = fs.readFileSync(path.join(root, 'about.html'), 'utf8');
assert.ok(!/prototype|There is no account/i.test(about), 'about page matches the live site');

const planner = fs.readFileSync(path.join(root, 'js/planner.js'), 'utf8');
assert.ok(!/affiliate-placeholder|Buy seeds<\/a>/.test(planner), 'no Buy seeds link in the shopping list');
assert.ok((planner.match(/cleanGarden\(/g) || []).length >= 5, 'every garden load is cleaned');
const account = fs.readFileSync(path.join(root, 'js/account.js'), 'utf8');
assert.ok(account.includes("$('plusMonthly').hidden = !!isPlus"), 'members do not see buy buttons in the planner');

const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy'].forEach(function (h) {
  assert.ok(toml.includes(h + ' = '), 'netlify.toml sets ' + h);
});
assert.ok(/script-src 'self' 'unsafe-inline'/.test(toml), 'inline scripts still run');
assert.ok(/camera=\(self\)/.test(toml), 'Take photo still works');
assert.ok(!/Strict-Transport-Security/.test(toml), 'HSTS waits for Force HTTPS');

const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Sitemap: https://bloomandbedgarden.com/sitemap.xml'));
const locs = sitemap.match(/<loc>[^<]+<\/loc>/g);
assert.strictEqual(new Set(locs).size, locs.length, 'no duplicate sitemap URLs');
locs.forEach(function (l) {
  const u = l.slice(5, -6).replace('https://bloomandbedgarden.com', '');
  let file = path.join(root, u === '/' ? 'index.html' : u);
  if (u.endsWith('/')) file = path.join(root, u, 'index.html');
  assert.ok(fs.existsSync(file), 'sitemap URL has a file: ' + u);
});
console.log('site markup tests passed', pages.length, 'pages');
