import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { decodePdf, decryptPdf, digest, encryptPdf, hashPassword, newToken, safeFilename, verifyPassword } from './dataRoomCrypto';
const pdf=Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n');
beforeAll(()=>{vi.stubEnv('DATA_ROOM_ENCRYPTION_KEY','unit-test-only-strong-encryption-secret-never-for-deployment');});
afterAll(()=>vi.unstubAllEnvs());
describe('Data room encrypted document storage',()=>{
 it('roundtrips PDF bytes without storing plaintext PDFs',()=>{const a=encryptPdf(pdf),b=encryptPdf(pdf);expect(a.subarray(0,4).toString()).toBe('PHE1');expect(a.equals(b)).toBe(false);expect(a.includes(Buffer.from('%PDF-'))).toBe(false);expect(decryptPdf(a)).toEqual(pdf);});
 it('rejects altered ciphertext and modified authentication tags',()=>{const a=encryptPdf(pdf);a[a.length-1]^=1;expect(()=>decryptPdf(a)).toThrow();const b=encryptPdf(pdf);b[17]^=1;expect(()=>decryptPdf(b)).toThrow();});
 it('rejects plaintext or truncated private objects',()=>{expect(()=>decryptPdf(pdf)).toThrow();expect(()=>decryptPdf(Buffer.from('PHE1'))).toThrow();});
 it('uses high entropy opaque tokens and irreversible database digests',()=>{const a=newToken();expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(newToken()).not.toBe(a);expect(digest(a)).toMatch(/^[0-9a-f]{64}$/);expect(digest(a)).not.toContain(a);});
});
describe('Individual password handling',()=>{
 it('salts each password, verifies correct values and rejects incorrect values',async()=>{const a=await hashPassword('long-password-for-unit-test'),b=await hashPassword('long-password-for-unit-test');expect(a).not.toBe(b);expect(a).not.toContain('long-password');expect(await verifyPassword('long-password-for-unit-test',a)).toBe(true);expect(await verifyPassword('another-password',a)).toBe(false);});
 it('rejects malformed stored password hashes',async()=>{expect(await verifyPassword('anything','broken')).toBe(false);expect(await verifyPassword('anything','scrypt-v1:abc:123')).toBe(false);});
});
describe('Administrator PDF upload checks',()=>{
 it('accepts a complete PDF and rejects non-PDF or truncated files',()=>{expect(decodePdf(pdf.toString('base64'),'document.pdf')).toEqual(pdf);expect(()=>decodePdf(pdf.toString('base64'),'document.html')).toThrow();expect(()=>decodePdf(Buffer.from('<html>not pdf</html>').toString('base64'),'document.pdf')).toThrow();expect(()=>decodePdf(Buffer.from('%PDF-1.4\ntruncated-pdf-document').toString('base64'),'document.pdf')).toThrow();});
 it('sanitizes filenames without header-injection or path separators',()=>{expect(safeFilename('../document\r\n".pdf')).not.toMatch(/[\r\n/\\"]/);});
});
