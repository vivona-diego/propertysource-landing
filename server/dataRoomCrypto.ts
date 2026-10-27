import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => err ? reject(err) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [version, salt, value] = encoded.split(":");
  if (version !== "scrypt-v1" || !/^[0-9a-f]{32}$/.test(salt ?? "") || !/^[0-9a-f]{128}$/.test(value ?? "")) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(value, "hex"));
}
function encryptionKey() {
  const secret = process.env.DATA_ROOM_ENCRYPTION_KEY || ENV.cookieSecret;
  if (secret.length < 20) throw new Error("A persistent strong encryption secret is required for private documents.");
  return createHash("sha256").update("PropertyHubExchange:private-investor-pdf:v1\0").update(secret).digest();
}
export function encryptPdf(bytes: Buffer) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from("PHE-DATA-ROOM-V1"));
  const body = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([Buffer.from("PHE1"), iv, cipher.getAuthTag(), body]);
}
export function decryptPdf(bytes: Buffer) {
  if (bytes.length < 32 || bytes.subarray(0, 4).toString() !== "PHE1") throw new Error("Invalid private document.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(4, 16));
  decipher.setAAD(Buffer.from("PHE-DATA-ROOM-V1"));
  decipher.setAuthTag(bytes.subarray(16, 32));
  return Buffer.concat([decipher.update(bytes.subarray(32)), decipher.final()]);
}
// Retain the v1 encryption format and key derivation so existing PDFs remain readable.
export const encryptDocument = encryptPdf;
export const decryptDocument = decryptPdf;
export function decodePdf(base64: string, filename: string) {
  if (!/\.pdf$/i.test(filename) || base64.length > Math.ceil(MAX_PDF_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error("Choose a PDF file no larger than 15 MB.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_PDF_BYTES || bytes.length < 16 || bytes.subarray(0, 5).toString() !== "%PDF-" || !bytes.subarray(-2048).toString("latin1").includes("%%EOF")) throw new Error("The uploaded file must be a complete PDF, up to 15 MB.");
  return bytes;
}
export function safeFilename(value: string) {
  return value.replace(/[\r\n\x00-\x1f\/\\"<>]/g, "_").slice(0, 200) || "document.pdf";
}
