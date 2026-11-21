import { getStore } from "@netlify/blobs";
import { FILE_CAP, STORAGE_CAP, gardenBytes, isPlus, json, newId, readUser, verifyStripe } from "./lib.mjs";

const accounts = () => getStore({ name: "yardgrid-accounts", consistency: "strong" });
const gardens = () => getStore({ name: "yardgrid-gardens", consistency: "strong" });
const files = () => getStore({ name: "yardgrid-files", consistency: "strong" });

const PUBLIC_SITE = "https://bloomandbedgarden.com";
function siteOrigin(req) {
  return new URL(req.url).origin;
}

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
  try {
    if (parts[1] === "stripe-webhook" && req.method === "POST") return stripeWebhook(req);
    if (parts[1] === "share" && parts[2] && req.method === "GET") {
      if (parts[3] === "file" && parts[4]) return shareFile(parts[2], parts[4]);
      return shareGarden(parts[2]);
    }
    const user = await readUser(req);
    if (!user) return json({ error: "Sign in first." }, 401);
    if (parts[1] === "me" && req.method === "GET") return me(user);
    if (parts[1] === "account" && req.method === "DELETE") return deleteAccount(req, user);
    if (parts[1] === "checkout" && req.method === "POST") return checkout(req, user);
    if (parts[1] === "portal" && req.method === "POST") return portal(req, user);
    if (parts[1] === "files" && req.method === "POST") return saveFile(req, user);
    if (parts[1] === "files" && parts[2] && req.method === "GET") return readFile(user, parts[2]);
    if (parts[1] === "gardens" && req.method === "GET" && !parts[2]) return listGardens(user);
    if (parts[1] === "gardens" && req.method === "POST" && !parts[2]) return saveGarden(req, user);
    if (parts[1] === "gardens" && parts[2] && req.method === "GET") return readGarden(user, parts[2]);
    return json({ error: "Not found." }, 404);
  } catch (err) {
    return json({ error: err.message || "Something went wrong." }, 500);
  }
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
  const bytes = await req.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > FILE_CAP) return json({ error: "That picture is too large to store." }, 413);
  const used = await usedBytes(user.id, bytes.byteLength);
  if (used > STORAGE_CAP) return json({ error: "This account is at the 200 MB storage cap." }, 413);
  const fileId = newId();
  const type = req.headers.get("content-type") || "application/octet-stream";
  await files().set(user.id + "/" + fileId, bytes, { metadata: { bytes: String(bytes.byteLength), type: type } });
  return json({ fileId: fileId, bytes: bytes.byteLength });
}

async function readFile(user, fileId) {
  const key = user.id + "/" + fileId;
  const got = await files().getWithMetadata(key, { type: "arrayBuffer" });
  if (!got || !got.data) return json({ error: "That picture was not found." }, 404);
  const type = (got.metadata && got.metadata.type) || "application/octet-stream";
  return new Response(got.data, { headers: { "content-type": type, "cache-control": "private, max-age=3600" } });
}

async function saveGarden(req, user) {
  const account = await accountOf(user.id);
  if (!isPlus(account)) return json({ error: "Cloud save is part of Bloom & Bed Plus. Your browser copy is still here." }, 403);
  const body = await req.json();
  const kind = body.kind === "arrangement" ? "arrangement" : "plan";
  const id = body.id || newId();
  const existing = await gardens().get(user.id + "/" + id, { type: "json" });
  if (existing && existing.userId !== user.id) return json({ error: "That save was not found." }, 404);
  const record = {
    id: id,
    userId: user.id,
    name: String(body.name || "Garden").slice(0, 80),
    kind: kind,
    updated: new Date().toISOString(),
    shareToken: (existing && existing.shareToken) || newId(),
    garden: body.garden || {},
    photoId: body.photoId || "",
    stamps: Array.isArray(body.stamps) ? body.stamps : []
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
  if (!found || referencedFiles(found).indexOf(fileId) === -1) return json({ error: "That picture was not found." }, 404);
  const got = await files().getWithMetadata(found.userId + "/" + fileId, { type: "arrayBuffer" });
  if (!got || !got.data) return json({ error: "That picture was not found." }, 404);
  const type = (got.metadata && got.metadata.type) || "application/octet-stream";
  return new Response(got.data, { headers: { "content-type": type, "cache-control": "private, max-age=3600" } });
}

async function findByShare(token) {
  const { blobs } = await gardens().list();
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
  const data = await res.json();
  if (!res.ok) return json({ error: data.error && data.error.message ? data.error.message : "Checkout could not start." }, 502);
  return json({ url: data.url });
}

async function portal(req, user) {
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
  const data = await res.json();
  if (!res.ok) return json({ error: data.error && data.error.message ? data.error.message : "The billing portal could not open." }, 502);
  return json({ url: data.url });
}

async function stripeWebhook(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const payload = await req.text();
  if (!verifyStripe(payload, req.headers.get("stripe-signature") || "", secret)) {
    return json({ error: "The Stripe signature did not match." }, 400);
  }
  const event = JSON.parse(payload);
  const obj = event.data && event.data.object;
  if (!obj) return json({ ok: true });
  if (event.type === "checkout.session.completed") await applyCheckout(obj);
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") await applySubscription(obj);
  return json({ ok: true });
}

async function applyCheckout(session) {
  const userId = (session.metadata && session.metadata.userId) || session.client_reference_id;
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
  const account = await accountOf(userId);
  account.stripeCustomerId = sub.customer || account.stripeCustomerId;
  account.subscriptionId = sub.id;
  account.status = sub.status || "";
  account.plusUntil = sub.current_period_end ? sub.current_period_end * 1000 : 0;
  const open = sub.status === "active" || sub.status === "trialing";
  account.plus = open;
  await accounts().setJSON(userId, account);
}

async function deleteAccount(req, user) {
  const gardenRows = await listPrefixed(gardens(), user.id + "/");
  for (let i = 0; i < gardenRows.length; i++) await gardens().delete(gardenRows[i].key);
  const fileRows = await listPrefixed(files(), user.id + "/");
  for (let i = 0; i < fileRows.length; i++) await files().delete(fileRows[i].key);
  await accounts().delete(user.id);
  await fetch(siteOrigin(req) + "/.netlify/identity/user", {
    method: "DELETE",
    headers: { Authorization: "Bearer " + user._token }
  });
  return json({ ok: true });
}
