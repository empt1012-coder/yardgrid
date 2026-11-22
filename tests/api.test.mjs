/* The /api function, run with in-memory stand-ins for Netlify Blobs, Identity, and Stripe.
   Nothing here talks to the network or to the real stores. */
import assert from 'node:assert';
import crypto from 'node:crypto';
import { registerHooks } from 'node:module';

const STUBS = {
  '@netlify/blobs': `
    const stores = globalThis.__stores || (globalThis.__stores = {});
    export function getStore(opts) {
      const name = typeof opts === 'string' ? opts : opts.name;
      const m = stores[name] || (stores[name] = new Map());
      const read = (v, type) => v == null ? null : type === 'json' ? JSON.parse(v.data) : v.data;
      return {
        async get(k, o) { return read(m.get(k), o && o.type); },
        async getWithMetadata(k, o) { const v = m.get(k); return v ? { data: read(v, o && o.type), metadata: v.metadata } : null; },
        async getMetadata(k) { const v = m.get(k); return v ? { metadata: v.metadata } : null; },
        async set(k, data, o) { m.set(k, { data, metadata: (o && o.metadata) || {} }); },
        async setJSON(k, obj) { m.set(k, { data: JSON.stringify(obj), metadata: {} }); },
        async delete(k) { m.delete(k); },
        list(o) {
          const prefix = (o && o.prefix) || '';
          const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key }));
          if (o && o.paginate) return (async function* () { for (let i = 0; i < keys.length; i += 2) yield { blobs: keys.slice(i, i + 2) }; })();
          return Promise.resolve({ blobs: keys.slice(0, 2) });
        }
      };
    }`,
  '@netlify/identity': `
    export const admin = { async deleteUser(id) { if (globalThis.__identityFail) throw new Error('no'); (globalThis.__deleted || (globalThis.__deleted = [])).push(id); } };`
};
registerHooks({
  resolve(specifier, context, next) {
    if (STUBS[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(STUBS[specifier]), shortCircuit: true };
    return next(specifier, context);
  }
});

const USERS = { tokA: { id: 'userA', email: 'a@example.test' }, tokB: { id: 'userB', email: 'b@example.test' } };
const stripeCalls = [];
globalThis.fetch = async function (url, opts) {
  url = String(url);
  if (url.endsWith('/.netlify/identity/user')) {
    const tok = String((opts && opts.headers && opts.headers.Authorization) || '').slice(7);
    return USERS[tok] ? new Response(JSON.stringify(USERS[tok]), { status: 200 }) : new Response('{}', { status: 401 });
  }
  if (url.startsWith('https://api.stripe.com/')) {
    stripeCalls.push({ url, body: String(opts.body) });
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.test/s' }), { status: 200 });
  }
  throw new Error('unexpected fetch ' + url);
};
process.env.STRIPE_SECRET_KEY = 'rk_test_example';
process.env.STRIPE_PRICE_MONTHLY = 'price_m';
process.env.STRIPE_PRICE_YEARLY = 'price_y';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_example';

const { default: handler } = await import('../netlify/functions/api.mjs');
const lib = await import('../netlify/functions/lib.mjs');
const origError = console.error;
console.error = function () {};

const SITE = 'https://bloomandbedgarden.com';
function call(method, path, opts) {
  opts = opts || {};
  const headers = Object.assign({}, opts.headers || {});
  if (opts.token) headers.authorization = 'Bearer ' + opts.token;
  let body = opts.body;
  if (body && typeof body === 'object' && !(body instanceof Uint8Array)) { body = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  return handler(new Request(SITE + path, { method, headers, body }));
}
async function j(res) { return { status: res.status, body: await res.json() }; }
function signed(event) {
  const payload = JSON.stringify(event);
  const t = String(Math.floor(Date.now() / 1000));
  const v1 = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(t + '.' + payload).digest('hex');
  return call('POST', '/api/stripe-webhook', { body: payload, headers: { 'stripe-signature': 't=' + t + ',v1=' + v1, 'content-type': 'application/json' } });
}
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const HTML = new TextEncoder().encode('<html><script>alert(1)</script></html>');

/* Auth */
assert.strictEqual((await call('GET', '/api/me')).status, 401, 'no token is 401');
assert.strictEqual((await call('GET', '/api/me', { token: 'nope' })).status, 401, 'bad token is 401');
let r = await j(await call('GET', '/api/me', { token: 'tokA' }));
assert.deepStrictEqual(r.body, { email: 'a@example.test', plus: false, status: 'free' });

/* Free accounts cannot write */
assert.strictEqual((await call('POST', '/api/gardens', { token: 'tokA', body: { name: 'x' } })).status, 403);

/* Webhook: bad signature, bad JSON, someone else's checkout on the shared Stripe account */
assert.strictEqual((await call('POST', '/api/stripe-webhook', { body: '{}', headers: { 'stripe-signature': 't=1,v1=00' } })).status, 400);
r = await signed({ type: 'checkout.session.completed', data: { object: { mode: 'payment', client_reference_id: 'userA', customer: 'cus_cc' } } });
assert.strictEqual(r.status, 200);
assert.strictEqual((await j(await call('GET', '/api/me', { token: 'tokA' }))).body.plus, false, 'a non-Bloom & Bed checkout does not turn on Plus');
r = await signed({ type: 'checkout.session.completed', data: { object: { mode: 'subscription', status: 'complete', metadata: { userId: 'userA' }, customer: 'cus_A', subscription: 'sub_A' } } });
assert.strictEqual(r.status, 200);
assert.strictEqual((await j(await call('GET', '/api/me', { token: 'tokA' }))).body.plus, true, 'our checkout turns on Plus');

/* Already Plus: no second checkout */
r = await j(await call('POST', '/api/checkout', { token: 'tokA', body: { plan: 'month' } }));
assert.strictEqual(r.status, 409, 'no double subscription');
r = await j(await call('POST', '/api/checkout', { token: 'tokB', body: { plan: 'year' } }));
assert.strictEqual(r.status, 200);
assert.ok(stripeCalls[stripeCalls.length - 1].body.includes('price_y') && stripeCalls[stripeCalls.length - 1].body.includes('automatic_tax%5Benabled%5D=true'), 'yearly price with automatic tax');

/* Files: only real images, served with safe headers */
r = await call('POST', '/api/files', { token: 'tokA', body: HTML, headers: { 'content-type': 'text/html' } });
assert.strictEqual(r.status, 415, 'HTML upload refused');
r = await call('POST', '/api/files', { token: 'tokA', body: new Uint8Array(lib.FILE_CAP + 1), headers: { 'content-type': 'image/png' } });
assert.strictEqual(r.status, 413, 'over 4 MB refused');
r = await j(await call('POST', '/api/files', { token: 'tokA', body: PNG, headers: { 'content-type': 'text/html' } }));
assert.strictEqual(r.status, 200);
const fileId = r.body.fileId;
r = await call('GET', '/api/files/' + fileId, { token: 'tokA' });
assert.strictEqual(r.headers.get('content-type'), 'image/png', 'type comes from the bytes, not the upload header');
assert.strictEqual(r.headers.get('x-content-type-options'), 'nosniff');
assert.ok(/sandbox/.test(r.headers.get('content-security-policy')));
assert.strictEqual((await call('GET', '/api/files/' + fileId, { token: 'tokB' })).status, 404, 'another user cannot read it');

/* Gardens: validation, bad JSON, share link */
assert.strictEqual((await call('POST', '/api/gardens', { token: 'tokA', body: 'not json', headers: { 'content-type': 'application/json' } })).status, 400, 'bad JSON is 400, not 500');
assert.strictEqual((await call('POST', '/api/gardens', { token: 'tokA', body: { id: '../userB/x', garden: {} } })).status, 400, 'odd ids refused');
assert.strictEqual((await call('POST', '/api/gardens', { token: 'tokA', body: { garden: {}, stamps: [{ id: 's1', fileId: '"><x' }] } })).status, 400);
assert.strictEqual((await call('POST', '/api/gardens', { token: 'tokA', body: { garden: {}, photoId: 'missing1' } })).status, 400, 'unknown picture');
r = await j(await call('POST', '/api/gardens', { token: 'tokA', body: { name: 'Front bed', kind: 'plan', garden: { beds: [] }, photoId: fileId } }));
assert.strictEqual(r.status, 200);
const share = r.body.garden.shareToken;
for (let i = 0; i < 4; i++) await call('POST', '/api/gardens', { token: 'tokA', body: { name: 'Extra ' + i, garden: {} } });
r = await j(await call('GET', '/api/share/' + share));
assert.strictEqual(r.status, 200, 'share link found past the first page of saves');
assert.strictEqual(r.body.garden.name, 'Front bed');
assert.strictEqual(r.body.garden.shareToken, undefined, 'share view hides the token');
r = await call('GET', '/api/share/' + share + '/file/' + fileId);
assert.strictEqual(r.status, 200);
assert.strictEqual(r.headers.get('content-type'), 'image/png');
assert.strictEqual((await call('GET', '/api/share/bad%20token')).status, 404);
r = await j(await call('POST', '/api/gardens', { token: 'tokA', body: { garden: {}, name: 'x'.repeat(10) } }));
assert.strictEqual((await call('POST', '/api/gardens', { token: 'tokA', body: { garden: { pad: 'x'.repeat(lib.GARDEN_CAP) } } })).status, 413, 'oversized garden JSON');
r = await j(await call('GET', '/api/gardens', { token: 'tokA' }));
assert.strictEqual(r.body.gardens.length, 6, 'lists every page of saves');

/* Subscription events */
await signed({ type: 'customer.subscription.updated', data: { object: { id: 'sub_old', status: 'canceled', customer: 'cus_A', metadata: { userId: 'userA' } } } });
assert.strictEqual((await j(await call('GET', '/api/me', { token: 'tokA' }))).body.plus, true, 'an older subscription ending does not switch off the current one');
const end = Math.floor(Date.now() / 1000) + 86400 * 20;
await signed({ type: 'customer.subscription.updated', data: { object: { id: 'sub_A', status: 'active', customer: 'cus_A', metadata: { userId: 'userA' }, items: { data: [{ current_period_end: end }] } } } });
assert.strictEqual(lib.periodEnd({ items: { data: [{ current_period_end: end }] } }), end * 1000, 'period end read from the item on newer Stripe API versions');

/* Delete is refused while Plus will renew; allowed after cancel */
r = await j(await call('DELETE', '/api/account', { token: 'tokA' }));
assert.strictEqual(r.status, 409, 'cancel Plus before deleting');
await signed({ type: 'customer.subscription.updated', data: { object: { id: 'sub_A', status: 'active', cancel_at_period_end: true, customer: 'cus_A', metadata: { userId: 'userA' }, current_period_end: end } } });
assert.strictEqual((await j(await call('GET', '/api/me', { token: 'tokA' }))).body.plus, true, 'still Plus until the period ends');
r = await j(await call('DELETE', '/api/account', { token: 'tokA' }));
assert.strictEqual(r.status, 200);
assert.deepStrictEqual(globalThis.__deleted, ['userA'], 'the Identity user is removed with admin access');
assert.strictEqual([...globalThis.__stores['yardgrid-gardens'].keys()].filter((k) => k.startsWith('userA/')).length, 0, 'gardens gone');
assert.strictEqual([...globalThis.__stores['yardgrid-files'].keys()].filter((k) => k.startsWith('userA/')).length, 0, 'files gone');
globalThis.__identityFail = true;
r = await j(await call('DELETE', '/api/account', { token: 'tokB' }));
assert.strictEqual(r.status, 502, 'a failed sign-in removal is reported, not hidden');
globalThis.__identityFail = false;

/* Errors inside a route come back as a plain 500 JSON body */
const store = globalThis.__stores['yardgrid-accounts'];
const realGet = store.get;
store.get = function () { throw new Error('boom secret detail'); };
r = await j(await call('GET', '/api/me', { token: 'tokB' }));
store.get = realGet;
assert.strictEqual(r.status, 500);
assert.ok(!/secret detail/.test(r.body.error), 'internal error text is not shown');

/* Pure helpers */
assert.strictEqual(lib.imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
assert.strictEqual(lib.imageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), '');
assert.strictEqual(lib.validId('abc_123-X'), true);
assert.strictEqual(lib.validId('a/b'), false);
assert.strictEqual(lib.stillBilling({ subscriptionId: 's', status: 'active' }), true);
assert.strictEqual(lib.stillBilling({ subscriptionId: 's', status: 'active', cancelAtPeriodEnd: true }), false);
assert.strictEqual(lib.stillBilling({ subscriptionId: 's', status: 'canceled' }), false);

console.error = origError;
console.log('api tests passed');
