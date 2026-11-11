import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "w2i_social_session";
export const SESSION_SECONDS = 12 * 60 * 60;

function settings() {
  const password = process.env.SOCIAL_STUDIO_PASSWORD;
  const secret = process.env.SOCIAL_STUDIO_SESSION_SECRET;
  if (!password || !secret || secret.length < 32) return null;
  // Changing either setting invalidates previously issued sessions.
  return { password, key: createHmac("sha256", secret).update(password).digest() };
}

export function isPasswordConfigured() { return settings() !== null; }

export function passwordMatches(candidate: string) {
  const config = settings();
  if (!config || candidate.length > 1024) return false;
  return timingSafeEqual(createHash("sha256").update(candidate).digest(), createHash("sha256").update(config.password).digest());
}

export function createSession(now = Date.now()) {
  const config = settings();
  if (!config) throw new Error("Social Studio password protection is not configured.");
  const payload = `${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${createHmac("sha256", config.key).update(payload).digest("hex")}`;
}

export function validSession(token: string | undefined, now = Date.now()) {
  const config = settings();
  if (!config || !token || !/^\d{10}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, nonce, signature] = token.split(".");
  const timestamp = Math.floor(now / 1000);
  if (Number(expires) <= timestamp || Number(expires) > timestamp + SESSION_SECONDS) return false;
  const expected = createHmac("sha256", config.key).update(`${expires}.${nonce}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
