import crypto from "crypto";

const KEYLEN = 64;

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  if (!stored.startsWith("scrypt:")) return stored === password;
  const [, salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const key = await scryptAsync(password, salt);
  return crypto.timingSafeEqual(Buffer.from(keyHex, "hex"), key);
}
