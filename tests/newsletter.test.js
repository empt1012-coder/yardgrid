/* Newsletter signup is a plain link to Beehiiv, with no embed or Plus pitch. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const SUBSCRIBE = 'https://bloomandbedgarden.beehiiv.com/subscribe';
const pages = ['index.html', 'charts/what-to-plant.html', 'tools/soil-calculator.html'];

pages.forEach(function (rel) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(html.includes('class="') && /class="[^"]*notes-signup/.test(html), rel + ' has the signup block');
  assert.ok(html.includes('Seasonal garden notes by email'), rel + ' has the signup heading');
  assert.ok(html.includes('What to plant now and new free tools, every week or two. Free, unsubscribe anytime.'), rel + ' has the signup copy');
  assert.ok(!/<iframe\b/i.test(html), rel + ' has no iframe');
  assert.ok(!/beehiiv\.com\/[^"']+\.js|subscribe-form|embed\.beehiiv/i.test(html), rel + ' has no Beehiiv script');
  const signup = html.match(/<section class="[^"]*notes-signup[^"]*"[\s\S]*?<\/section>/);
  assert.ok(signup, rel + ' has a signup section');
  assert.ok(signup[0].includes('href="' + SUBSCRIBE + '"'), rel + ' button points at the subscribe page');
  assert.ok(signup[0].includes('target="_blank"'), rel + ' opens the subscribe page in a new tab');
  assert.ok(!/plus/i.test(signup[0]), rel + ' signup does not pitch Plus');
  const footer = html.match(/<nav class="nav" aria-label="Footer">[\s\S]*?<\/nav>/);
  assert.ok(footer, rel + ' has a footer nav');
  assert.ok(footer[0].includes('href="' + SUBSCRIBE + '"'), rel + ' footer links to the subscribe page');
  assert.ok(footer[0].includes('Garden notes'), rel + ' footer names the notes');
  assert.ok(footer[0].includes('target="_blank"'), rel + ' footer opens the subscribe page in a new tab');
});

const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
assert.ok(/form-action 'self'/.test(toml), 'forms still stay on this site');

console.log('newsletter signup tests passed');
