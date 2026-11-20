import assert from 'node:assert';
import crypto from 'node:crypto';
import { verifyStripe } from '../netlify/functions/lib.mjs';

const secret = 'whsec_test_example';
const payload = '{"id":"evt_test"}';
const t = String(Math.floor(Date.now() / 1000));
const v1 = crypto.createHmac('sha256', secret).update(t + '.' + payload).digest('hex');
assert.strictEqual(verifyStripe(payload, 't=' + t + ',v1=' + v1, secret), true);
assert.strictEqual(verifyStripe(payload, 't=' + t + ',v1=deadbeef', secret), false);
assert.strictEqual(verifyStripe(payload, 't=1,v1=' + v1, secret), false);
console.log('stripe signature tests passed');
