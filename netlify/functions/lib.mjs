import crypto from "node:crypto";

export const STORAGE_CAP = 200 * 1024 * 1024;
export const FILE_CAP = 4 * 1024 * 1024;

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
  const parts = {};
  header.split(",").forEach(function (piece) {
    const i = piece.indexOf("=");
    if (i > 0) parts[piece.slice(0, i)] = piece.slice(i + 1);
  });
  if (!parts.t || !parts.v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(parts.t + "." + payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function gardenBytes(record, fileBytes) {
  const jsonBytes = Buffer.byteLength(JSON.stringify(record || {}), "utf8");
  return jsonBytes + (fileBytes || 0);
}
