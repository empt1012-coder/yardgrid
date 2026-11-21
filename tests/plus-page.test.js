const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'plus.html'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'plan.html'), 'utf8');
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
assert.ok(js.includes("startCheckout('month')") && js.includes("startCheckout('year')"), 'shared click handlers');
assert.ok(js.includes("api('/api/checkout'") && js.includes("api('/api/portal'"), 'checkout and portal posts');
assert.ok(js.includes('pendingPlan'), 'checkout continues after sign-in');
assert.ok(js.includes('askToSignIn'), 'unsigned clicks open sign-in');
assert.ok(js.includes("if (!form) return") === false, 'account.js no longer bails when the planner form is missing');

console.log('plus page markers ok');
