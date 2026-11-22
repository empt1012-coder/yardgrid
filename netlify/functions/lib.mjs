import crypto from "node:crypto";

export const STORAGE_CAP = 200 * 1024 * 1024;
export const FILE_CAP = 4 * 1024 * 1024;
/* One saved garden's JSON (beds, plants, pieces). Pictures are stored separately. */
export const GARDEN_CAP = 2 * 1024 * 1024;

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
export function validId(value) {
  return typeof value === "string" && SAFE_ID.test(value);
}

/* Stored pictures are served back from this site, so the type comes from the file's own
   first bytes, never from the upload header. Only plain raster images are kept (no SVG or HTML). */
export function imageType(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || new ArrayBuffer(0));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return "";
}
const IMAGE_TYPES = { "image/jpeg": 1, "image/png": 1, "image/gif": 1, "image/webp": 1 };
export function fileHeaders(type) {
  return {
    "content-type": IMAGE_TYPES[type] ? type : "application/octet-stream",
    "cache-control": "private, max-age=3600",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "content-disposition": "inline"
  };
}

/* The parts of a save request the API keeps. Returns { error } when the request is not usable. */
export function cleanSave(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "That save could not be read." };
  if (body.id != null && body.id !== "" && !validId(body.id)) return { error: "That save could not be read." };
  if (body.photoId != null && body.photoId !== "" && !validId(body.photoId)) return { error: "A picture is missing. Save again." };
  const garden = body.garden && typeof body.garden === "object" && !Array.isArray(body.garden) ? body.garden : {};
  const stamps = [];
  const list = Array.isArray(body.stamps) ? body.stamps : [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (!s || !validId(s.id) || !validId(s.fileId)) return { error: "A picture is missing. Save again." };
    stamps.push({ id: s.id, fileId: s.fileId });
  }
  return {
    id: body.id || "",
    name: String(typeof body.name === "string" && body.name.trim() ? body.name : "Garden").slice(0, 80),
    kind: body.kind === "arrangement" ? "arrangement" : "plan",
    garden: garden,
    photoId: body.photoId || "",
    stamps: stamps
  };
}

/* Which Stripe events change a Bloom & Bed account. The Stripe account is shared with
   Circuit & Capital, so only sessions and subscriptions this site created (metadata.userId) count. */
export function checkoutUser(session) {
  if (!session || session.mode !== "subscription") return "";
  if (session.status && session.status !== "complete") return "";
  const id = session.metadata && session.metadata.userId;
  return typeof id === "string" && id ? id : "";
}
export function periodEnd(sub) {
  if (sub && sub.current_period_end) return Number(sub.current_period_end) * 1000;
  const item = sub && sub.items && Array.isArray(sub.items.data) && sub.items.data[0];
  return item && item.current_period_end ? Number(item.current_period_end) * 1000 : 0;
}
export function subscriptionUpdate(account, sub) {
  const open = sub.status === "active" || sub.status === "trialing";
  /* An older subscription ending must not switch off a newer one. */
  if (account.subscriptionId && account.subscriptionId !== sub.id && !open) return null;
  return Object.assign({}, account, {
    stripeCustomerId: sub.customer || account.stripeCustomerId,
    subscriptionId: sub.id,
    status: sub.status || "",
    plusUntil: periodEnd(sub),
    cancelAtPeriodEnd: !!(sub.cancel_at_period_end || sub.cancel_at),
    plus: open
  });
}
/* A subscription that will bill again. Deleting the account while one is running would leave
   the person paying with no way to sign in and cancel. */
export function stillBilling(account) {
  if (!account || !account.subscriptionId) return false;
  if (account.status !== "active" && account.status !== "trialing" && account.status !== "past_due") return false;
  return !account.cancelAtPeriodEnd;
}

export function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export function isPlus(account) {
  if (!account || account.plus !== true) return false;
  if (account.plusUntil && Number(account.plusUntil) < Date.now()) return false;
  return true;
}

export async function readUser(req) {
  const header = req.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const origin = new URL(req.url).origin;
  let res;
  try {
    res = await fetch(origin + "/.netlify/identity/user", { headers: { Authorization: header } });
  } catch (err) {
    return null;
  }
  if (!res.ok) return null;
  const user = await res.json();
  if (!user || !user.id) return null;
  user._token = header.slice(7).trim();
  return user;
}

export function newId() {
  return crypto.randomBytes(12).toString("hex");
}

export function verifyStripe(payload, header, secret) {
  if (!payload || !header || !secret) return false;
  let t = "";
  const sigs = [];
  header.split(",").forEach(function (piece) {
    const i = piece.indexOf("=");
    if (i <= 0) return;
    const k = piece.slice(0, i).trim();
    const v = piece.slice(i + 1).trim();
    if (k === "t") t = v;
    if (k === "v1") sigs.push(v);
  });
  if (!t || !sigs.length) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > 300) return false;
  const a = Buffer.from(crypto.createHmac("sha256", secret).update(t + "." + payload).digest("hex"));
  /* Stripe can send more than one v1 signature while a secret is being rolled. */
  return sigs.some(function (sig) {
    const b = Buffer.from(sig);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

export function gardenBytes(record, fileBytes) {
  const jsonBytes = Buffer.byteLength(JSON.stringify(record || {}), "utf8");
  return jsonBytes + (fileBytes || 0);
}
