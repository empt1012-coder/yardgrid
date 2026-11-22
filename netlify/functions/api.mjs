import { getStore } from "@netlify/blobs";
import {
  FILE_CAP, GARDEN_CAP, STORAGE_CAP, checkoutUser, cleanSave, fileHeaders, gardenBytes, imageType, isPlus, json,
  hasOpenSubscription, newId, ownsSubscription, readUser, subscriptionUpdate, validId, verifyStripe
} from "./lib.mjs";

const accounts = () => getStore({ name: "yardgrid-accounts", consistency: "strong" });
const gardens = () => getStore({ name: "yardgrid-gardens", consistency: "strong" });
const files = () => getStore({ name: "yardgrid-files", consistency: "strong" });

const PUBLIC_SITE = "https://bloomandbedgarden.com";

async function accountOf(userId) {
  return (await accounts().get(userId, { type: "json" })) || { plus: false };
}

async function listPrefixed(store, prefix) {
  const out = [];
  for await (const page of store.list({ prefix: prefix, paginate: true })) {
    out.push.apply(out, page.blobs);
  }
  return out;
}

async function usedBytes(userId, extra) {
  const rows = await listPrefixed(files(), userId + "/");
  let total = extra || 0;
  for (let i = 0; i < rows.length; i++) {
    const meta = await files().getMetadata(rows[i].key);
    total += Number(meta && meta.metadata && meta.metadata.bytes) || 0;
  }
  return total;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return json({ error: "Not found." }, 404);
  /* Every route is awaited here so a failure inside one is caught below, not left unhandled. */
  try {
    return await route(req, parts);
  } catch (err) {
    console.error("api error", parts[1] || "", err && err.stack ? err.stack : err);
    return json({ error: "Something went wrong. Try again in a minute." }, 500);
  }
}

async function route(req, parts) {
  if (parts[1] === "stripe-webhook" && req.method === "POST") return await stripeWebhook(req);
  if (parts[1] === "share" && parts[2] && req.method === "GET") {
    if (!validId(parts[2])) return json({ error: "That link does not open a garden." }, 404);
    if (parts[3] === "file" && parts[4]) return await shareFile(parts[2], parts[4]);
    return await shareGarden(parts[2]);
  }
  const user = await readUser(req);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (parts[1] === "me" && req.method === "GET") return await me(user);
  if (parts[1] === "account" && req.method === "DELETE") return await deleteAccount(user);
  if (parts[1] === "checkout" && req.method === "POST") return await checkout(req, user);
  if (parts[1] === "portal" && req.method === "POST") return await portal(user);
  if (parts[1] === "files" && req.method === "POST") return await saveFile(req, user);
  if (parts[1] === "files" && parts[2] && req.method === "GET") return await readFile(user, parts[2]);
  if (parts[1] === "gardens" && req.method === "GET" && !parts[2]) return await listGardens(user);
  if (parts[1] === "gardens" && req.method === "POST" && !parts[2]) return await saveGarden(req, user);
  if (parts[1] === "gardens" && parts[2] && req.method === "GET") return await readGarden(user, parts[2]);
  return json({ error: "Not found." }, 404);
}

export const config = { path: "/api/*" };

async function me(user) {
  const account = await accountOf(user.id);
  return json({
    email: user.email || "",
    plus: isPlus(account),
    status: account.status || (isPlus(account) ? "active" : "free")
  });
}

async function listGardens(user) {
  const rows = await listPrefixed(gardens(), user.id + "/");
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const record = await gardens().get(rows[i].key, { type: "json" });
    if (!record) continue;
    items.push({
      id: record.id, name: record.name, kind: record.kind, updated: record.updated,
      shareToken: record.shareToken || ""
    });
  }
  items.sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)); });
  return json({ gardens: items, plus: isPlus(await accountOf(user.id)) });
}

async function readGarden(user, id) {
  if (!validId(id)) return json({ error: "That save was not found." }, 404);
  const record = await gardens().get(user.id + "/" + id, { type: "json" });
  if (!record) return json({ error: "That save was not found." }, 404);
  return json({ garden: publicRecord(record), plus: isPlus(await accountOf(user.id)) });
}

function publicRecord(record) {
  return {
    id: record.id, name: record.name, kind: record.kind, updated: record.updated,
    shareToken: record.shareToken || "",
    garden: record.garden, photoId: record.photoId || "", stamps: record.stamps || []
  };
}

async function saveFile(req, user) {
  const account = await accountOf(user.id);
  if (!isPlus(account)) return json({ error: "Cloud save is part of Bloom & Bed Plus." }, 403);
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > FILE_CAP) return json({ error: "That picture is too large to store." }, 413);
  const bytes = await req.arrayBuffer();
  if (!bytes.byteLength) return json({ error: "That picture was empty." }, 400);
  if (bytes.byteLength > FILE_CAP) return json({ error: "That picture is too large to store." }, 413);
  const type = imageType(bytes);
  if (!type) return json({ error: "Only JPG, PNG, WebP, or GIF pictures can be stored." }, 415);
  const used = await usedBytes(user.id, bytes.byteLength);
  if (used > STORAGE_CAP) return json({ error: "This account is at the 200 MB storage cap." }, 413);
  const fileId = newId();
  await files().set(user.id + "/" + fileId, bytes, { metadata: { bytes: String(bytes.byteLength), type: type } });
  return json({ fileId: fileId, bytes: bytes.byteLength });
}

async function readFile(user, fileId) {
  if (!validId(fileId)) return json({ error: "That picture was not found." }, 404);
  const key = user.id + "/" + fileId;
  const got = await files().getWithMetadata(key, { type: "arrayBuffer" });
  if (!got || !got.data) return json({ error: "That picture was not found." }, 404);
  return new Response(got.data, { headers: fileHeaders(imageType(got.data)) });
}

async function saveGarden(req, user) {
  const account = await accountOf(user.id);
  if (!isPlus(account)) return json({ error: "Cloud save is part of Bloom & Bed Plus. Your browser copy is still here." }, 403);
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > GARDEN_CAP) return json({ error: "That garden is too large to save. Try removing some pieces." }, 413);
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > GARDEN_CAP) return json({ error: "That garden is too large to save. Try removing some pieces." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch (err) { return json({ error: "That save could not be read." }, 400); }
  const clean = cleanSave(body);
  if (clean.error) return json({ error: clean.error }, 400);
  const id = clean.id || newId();
  const existing = await gardens().get(user.id + "/" + id, { type: "json" });
  if (existing && existing.userId !== user.id) return json({ error: "That save was not found." }, 404);
  const record = {
    id: id,
    userId: user.id,
    name: clean.name,
    kind: clean.kind,
    updated: new Date().toISOString(),
    shareToken: (existing && existing.shareToken) || newId(),
    garden: clean.garden,
    photoId: clean.photoId,
    stamps: clean.stamps
  };
  const fileIds = referencedFiles(record);
  const owned = await listPrefixed(files(), user.id + "/");
  let incoming = 0;
  for (let i = 0; i < fileIds.length; i++) {
    const meta = await files().getMetadata(user.id + "/" + fileIds[i]);
    if (!meta) return json({ error: "A picture is missing. Save again." }, 400);
    incoming += Number(meta.metadata && meta.metadata.bytes) || 0;
  }
  const otherGardens = await listPrefixed(gardens(), user.id + "/");
  const keep = new Set(fileIds);
  for (let i = 0; i < otherGardens.length; i++) {
    if (otherGardens[i].key === user.id + "/" + id) continue;
    const other = await gardens().get(otherGardens[i].key, { type: "json" });
    referencedFiles(other).forEach(function (fileId) { keep.add(fileId); });
  }
  let total = gardenBytes(record, 0);
  for (let i = 0; i < owned.length; i++) {
    const fileId = owned[i].key.slice(user.id.length + 1);
    if (!keep.has(fileId)) continue;
    const meta = await files().getMetadata(owned[i].key);
    total += Number(meta && meta.metadata && meta.metadata.bytes) || 0;
  }
  if (total > STORAGE_CAP) return json({ error: "This account is at the 200 MB storage cap." }, 413);
  await gardens().setJSON(user.id + "/" + id, record);
  for (let i = 0; i < owned.length; i++) {
    const fileId = owned[i].key.slice(user.id.length + 1);
    if (!keep.has(fileId)) await files().delete(owned[i].key);
  }
  return json({ garden: publicRecord(record) });
}

function referencedFiles(record) {
  if (!record) return [];
  const ids = [];
  if (record.photoId) ids.push(record.photoId);
  (record.stamps || []).forEach(function (stamp) { if (stamp && stamp.fileId) ids.push(stamp.fileId); });
  return ids;
}

async function shareGarden(token) {
  const found = await findByShare(token);
  if (!found) return json({ error: "That link does not open a garden." }, 404);
  const copy = publicRecord(found);
  delete copy.shareToken;
  return json({ garden: copy });
}

async function shareFile(token, fileId) {
  const found = await findByShare(token);
  if (!validId(fileId) || !found || referencedFiles(found).indexOf(fileId) === -1) return json({ error: "That picture was not found." }, 404);
  const got = await files().getWithMetadata(found.userId + "/" + fileId, { type: "arrayBuffer" });
  if (!got || !got.data) return json({ error: "That picture was not found." }, 404);
  return new Response(got.data, { headers: fileHeaders(imageType(got.data)) });
}

async function findByShare(token) {
  /* Every page of saves, not only the first one the list call returns. */
  const blobs = await listPrefixed(gardens(), "");
  for (let i = 0; i < blobs.length; i++) {
    const record = await gardens().get(blobs[i].key, { type: "json" });
    if (record && record.shareToken === token) return record;
  }
  return null;
}

function stripeKeyOk(key) {
  return key.indexOf("sk_test_") === 0 || key.indexOf("rk_test_") === 0 ||
    key.indexOf("sk_live_") === 0 || key.indexOf("rk_live_") === 0;
}

async function checkout(req, user) {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const body = await req.json().catch(function () { return {}; });
  const price = body.plan === "year" ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
  if (!key || !price || !stripeKeyOk(key)) {
    return json({ error: "Plus checkout is not turned on yet." }, 503);
  }
  const account = await accountOf(user.id);
  if (isPlus(account)) {
    return json({ error: "Bloom & Bed Plus is already on for this account. Use Manage subscription to change it." }, 409);
  }
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", price);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", PUBLIC_SITE + "/plan.html?plus=1");
  params.set("cancel_url", PUBLIC_SITE + "/plus.html");
  params.set("client_reference_id", user.id);
  params.set("metadata[userId]", user.id);
  params.set("subscription_data[metadata][userId]", user.id);
  params.set("automatic_tax[enabled]", "true");
  if (account.stripeCustomerId) params.set("customer", account.stripeCustomerId);
  else if (user.email) params.set("customer_email", user.email);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok || !data.url) {
    console.error("stripe checkout", res.status, data.error && data.error.message);
    return json({ error: "Checkout could not start. Try again in a minute." }, 502);
  }
  return json({ url: data.url });
}

async function portal(user) {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const account = await accountOf(user.id);
  if (!key || !stripeKeyOk(key) || !account.stripeCustomerId) {
    return json({ error: "Subscription management is not available yet." }, 503);
  }
  const params = new URLSearchParams();
  params.set("customer", account.stripeCustomerId);
  params.set("return_url", PUBLIC_SITE + "/plan.html");
  if (process.env.STRIPE_PORTAL_CONFIGURATION) params.set("configuration", process.env.STRIPE_PORTAL_CONFIGURATION);
  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok || !data.url) {
    console.error("stripe portal", res.status, data.error && data.error.message);
    return json({ error: "The billing page could not open. Try again in a minute." }, 502);
  }
  return json({ url: data.url });
}

async function stripeWebhook(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const payload = await req.text();
  if (!verifyStripe(payload, req.headers.get("stripe-signature") || "", secret)) {
    return json({ error: "The Stripe signature did not match." }, 400);
  }
  let event;
  try { event = JSON.parse(payload); } catch (err) { return json({ error: "The event could not be read." }, 400); }
  const obj = event && event.data && event.data.object;
  if (!obj) return json({ ok: true });
  if (event.type === "checkout.session.completed") await applyCheckout(obj);
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") await applySubscription(obj);
  return json({ ok: true });
}

async function applyCheckout(session) {
  const userId = checkoutUser(session);
  if (!userId) return;
  const account = await accountOf(userId);
  account.stripeCustomerId = session.customer || account.stripeCustomerId;
  if (session.subscription) account.subscriptionId = session.subscription;
  account.plus = true;
  account.status = "active";
  await accounts().setJSON(userId, account);
}

async function applySubscription(sub) {
  const userId = sub.metadata && sub.metadata.userId;
  if (!userId) return;
  const stored = await accounts().get(userId, { type: "json" });
  /* A deleted account's cancellation event arrives after the record is gone. Do not recreate it. */
  if (!stored && sub.status !== "active" && sub.status !== "trialing") return;
  const next = subscriptionUpdate(stored || { plus: false }, sub);
  if (next) await accounts().setJSON(userId, next);
}

/* Cancels this user's Plus subscription now. Returns true when it is cancelled (or was already over). */
async function cancelSubscription(user, account) {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key || !stripeKeyOk(key) || !validStripeId(account.subscriptionId)) return false;
  const url = "https://api.stripe.com/v1/subscriptions/" + encodeURIComponent(account.subscriptionId);
  const headers = { Authorization: "Bearer " + key };
  try {
    const got = await fetch(url, { headers: headers });
    const sub = await got.json().catch(function () { return {}; });
    if (!got.ok) {
      console.error("stripe subscription read", got.status, sub.error && sub.error.message);
      return false;
    }
    if (!ownsSubscription(sub, user.id, account)) {
      console.error("stripe subscription is not this user's", account.subscriptionId);
      return false;
    }
    if (sub.status === "canceled" || sub.status === "incomplete_expired") return true;
    const res = await fetch(url, { method: "DELETE", headers: headers });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.status !== "canceled") {
      console.error("stripe subscription cancel", res.status, data.error && data.error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("stripe subscription cancel", err && err.message);
    return false;
  }
}

function validStripeId(id) {
  return typeof id === "string" && /^sub_[A-Za-z0-9]{1,250}$/.test(id);
}

async function deleteAccount(user) {
  const account = await accountOf(user.id);
  /* Plus is cancelled first. If that fails, nothing is deleted. */
  if (hasOpenSubscription(account)) {
    const cancelled = await cancelSubscription(user, account);
    if (!cancelled) {
      return json({ error: "Plus could not be cancelled, so nothing was deleted. Email hello@bloomandbedgarden.com and we will cancel Plus and delete the account." }, 502);
    }
  }
  const gardenRows = await listPrefixed(gardens(), user.id + "/");
  for (let i = 0; i < gardenRows.length; i++) await gardens().delete(gardenRows[i].key);
  const fileRows = await listPrefixed(files(), user.id + "/");
  for (let i = 0; i < fileRows.length; i++) await files().delete(fileRows[i].key);
  await accounts().delete(user.id);
  /* Identity has no self-delete endpoint, so the sign-in is removed with the function's admin access. */
  try {
    const { admin } = await import("@netlify/identity");
    await admin.deleteUser(user.id);
  } catch (err) {
    console.error("identity delete", err && err.message);
    return json({ error: "Your saved gardens were deleted, but the sign-in could not be removed. Email hello@bloomandbedgarden.com and we will remove it." }, 502);
  }
  return json({ ok: true });
}
