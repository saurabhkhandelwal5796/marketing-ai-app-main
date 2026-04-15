import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "marketing_auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.SESSION_SECRET || "dev-only-session-secret-change-me";
}

function safeBase64Encode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeBase64Decode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadPart) {
  return crypto.createHmac("sha256", getSecret()).update(payloadPart).digest("base64url");
}

export function createSessionToken(session) {
  const payloadPart = safeBase64Encode(JSON.stringify(session));
  const signature = sign(payloadPart);
  return `${payloadPart}.${signature}`;
}

export function parseSessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;
  if (sign(payloadPart) !== signature) return null;
  try {
    const parsed = JSON.parse(safeBase64Decode(payloadPart));
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

export async function setSessionCookie(session) {
  const store = await cookies();
  const token = createSessionToken({
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role || null,
    is_admin: !!session.is_admin,
    admin_id: session.admin_id || null,
    admin_name: session.admin_name || null,
  });
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
