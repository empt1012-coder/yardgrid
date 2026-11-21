const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'plus.html'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'plan.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js/account.js'), 'utf8');

assert.ok(html.includes('Get Plus, $5 a month'), 'monthly checkout button');
assert.ok(html.includes('Get Plus, $30 a year'), 'yearly checkout button');
assert.ok(html.includes('id="plusMonthly"'), 'monthly button id');
assert.ok(html.includes('id="plusYearly"'), 'yearly button id');
assert.ok(html.includes('id="plusPortal"'), 'portal button id');
assert.ok(html.includes('Manage subscription'), 'portal label');
assert.ok(html.includes('id="plusBuy"') && html.includes('id="plusManage"'), 'buy and manage wrappers');
assert.ok(html.includes('id="accountForm"'), 'sign-in form is on the plus page');
assert.ok(html.includes('id="accountStatus"'), 'status line for errors');
assert.ok(html.includes('src="js/account.js"'), 'plus page loads account.js');
assert.ok(!html.includes('Save to your account'), 'old planner link is gone');
assert.ok(!html.includes('href="plan.html">Get Plus'), 'buttons are not planner links');

assert.ok(plan.includes('id="plusMonthly"') && plan.includes('id="plusYearly"') && plan.includes('id="plusPortal"'), 'planner checkout buttons remain');
assert.ok(plan.includes('src="js/account.js"'), 'planner loads account.js');
assert.ok(index.includes('src="js/account.js"'), 'home page loads account.js so confirmation links can be processed');
assert.ok(js.includes("startCheckout('month')") && js.includes("startCheckout('year')"), 'shared click handlers');
assert.ok(js.includes("api('/api/checkout'") && js.includes("api('/api/portal'"), 'checkout and portal posts');
assert.ok(js.includes('askToSignIn'), 'unsigned clicks open sign-in');
assert.ok(js.includes("if (!form) return") === false, 'account.js no longer bails when the planner form is missing');

assert.ok(js.includes("yardgrid-pending-plus"), 'pending plan is stored in localStorage');
assert.ok(js.includes('60 * 60 * 1000'), 'pending plan expires after an hour');
assert.ok(js.includes('confirmation_token'), 'email confirmation hash is processed');
assert.ok(js.includes("identity('/verify'"), 'confirmation token is verified with Netlify Identity');
assert.ok(js.includes("location.replace('/plus.html')"), 'other landing pages send a pending checkout back to plus.html');
assert.ok(js.includes("Check your email to confirm, then you'll go straight to checkout."), 'clear post-signup message');
assert.ok(js.includes('consumeIdentityHash'), 'hash tokens are consumed on page load');
assert.ok(js.includes('continuePendingCheckout'), 'checkout continues after confirmation');

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
});

console.log('plus page markers ok');
