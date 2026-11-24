const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'plus.html'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'plan.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js/account.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');

assert.ok(html.includes('Get Plus, $5 a month'), 'monthly checkout button');
assert.ok(html.includes('Get Plus, $30 a year'), 'yearly checkout button');
assert.ok(html.includes('id="plusMonthly"') && html.includes('id="plusYearly"') && html.includes('id="plusPortal"'), 'plus button ids');
assert.ok(html.includes('id="accountForm"') && html.includes('id="accountStatus"'), 'sign-in form and status');
assert.ok(html.includes('src="js/account.js"') && index.includes('src="js/account.js"'), 'plus and home load account.js');
assert.ok(index.includes('src="js/config.js"'), 'home loads config.js in time to keep the hash');
assert.ok(index.includes('<meta name="google-site-verification" content="5aUDvTAJZvLllM0J9P71zy-qEro_l_k9VWzHumEw2vs" />'), 'Search Console verification meta is on the homepage');
assert.ok(index.includes('<meta name="p:domain_verify" content="b32495e6d0bf46fd29c6dfb4636d9318"/>'), 'Pinterest domain verification meta is on the homepage');
assert.ok(!html.includes('Save to your account'), 'old planner link is gone');
assert.ok(plan.includes('id="plusMonthly"') && plan.includes('src="js/account.js"'), 'planner checkout remains');

assert.ok(js.includes("startCheckout('month')") && js.includes("api('/api/checkout'"), 'checkout handlers');
assert.ok(js.includes('yardgrid-pending-plus') && js.includes('60 * 60 * 1000'), 'pending plan storage and expiry');
assert.ok(js.includes('confirmation_token') && js.includes("identity('/verify'"), 'confirmation is verified');
assert.ok(js.includes("location.replace('/plus.html')"), 'other pages send a pending checkout to plus.html');
assert.ok(js.includes("Check your email to confirm, then you'll go straight to checkout."), 'post-signup message');
assert.ok(js.includes("Email confirmed. You're signed in."), 'visible result after the confirmation link');
assert.ok(js.includes('A new email was not sent, so the earlier link still works.'), 'repeat signup does not resend');
assert.ok(js.includes('Asking for a new email would make the earlier link stop working.'), 'unconfirmed sign-in does not resend');
assert.ok(js.includes("replace(/\\+/g, '%2B')"), 'plus signs in confirmation tokens are preserved');
assert.ok(js.includes('yardgrid-identity-hash'), 'hash is also read from sessionStorage');

assert.ok(config.includes('yardgrid-identity-hash'), 'config.js stores the identity hash immediately');
assert.ok(config.includes('wantPlus') || config.includes('/plus.html'), 'config.js sends confirmation links to plus.html');
assert.ok(config.includes('yardgrid.netlify.app'), 'config.js moves the netlify.app host without dropping the hash');

assert.ok(!/https:\/\/yardgrid\.netlify\.app\/\*\s+https:\/\/bloomandbedgarden\.com/.test(redirects), 'no server 301 from netlify.app to the custom domain');
assert.ok(!/https:\/\/www\.bloomandbedgarden\.com\/\*\s+https:\/\/bloomandbedgarden\.com/.test(redirects), 'no server 301 from www to the apex');

function walk(dir, files) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === '.git' || entry.name === 'node_modules') return;
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  });
}
const pages = [];
walk(root, pages);
assert.ok(pages.length >= 17, 'expected the public html pages');
pages.forEach(function (file) {
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(text.includes('js/account.js'), path.relative(root, file) + ' loads account.js');
  assert.ok(text.includes('js/config.js'), path.relative(root, file) + ' loads config.js');
});

console.log('plus page markers ok');

const planHtml = fs.readFileSync(path.join(__dirname, '..', 'plan.html'), 'utf8');
assert.ok(planHtml.includes('id="keepGarden"') && planHtml.includes('Your garden is saved in this browser.'), 'keep panel copy');
assert.ok(planHtml.includes('id="keepSave"') && planHtml.includes('id="keepImage"') && planHtml.includes('id="keepPrint"'), 'keep panel actions');
assert.ok(planHtml.includes('Want it on your phone too, or a link to share?') && planHtml.includes('href="plus.html"'), 'plus offer stays in the keep panel');
assert.ok(planHtml.includes('$5/month or $30/year'), 'plus price in the keep panel');
assert.ok(planHtml.includes('id="openSavedBox"') && planHtml.includes('Open a saved garden'), 'open-saved control');
assert.ok(planHtml.includes('id="saveBtn"') && planHtml.includes('id="exportBtn"') && planHtml.includes('id="printBtn"') && planHtml.includes('id="importFile"'), 'free save, export, print, and import stay');
assert.ok(!/disabled.*saveBtn|saveBtn[^>]*disabled/.test(planHtml), 'Save is not disabled in markup');
const account = fs.readFileSync(path.join(__dirname, '..', 'js/account.js'), 'utf8');
assert.ok(account.includes("$('plusPortal').hidden = !isPlus"), 'Manage subscription hides unless Plus is on');
