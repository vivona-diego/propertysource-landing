import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { decryptDocument, encryptDocument } from "./dataRoomCrypto";
import { decodeRoomDocument, MAX_DOCUMENT_BYTES, ROOM_FILE_MIME } from "./dataRoomFileTypes";

type ZipEntry = { name: string; body?: Buffer };

/** Builds an intentionally tiny, uncompressed ZIP with a conventional central directory. */
function zip(entries: ZipEntry[]): Buffer {
  let offset = 0;
  const locals = entries.map(({ name, body = Buffer.alloc(0) }) => {
    const filename = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 14); // CRC is not relevant to directory-only validation.
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(filename.length, 26);
    local.writeUInt16LE(0, 28);
    const result = { filename, body, local: Buffer.concat([local, filename, body]), offset };
    offset += result.local.length;
    return result;
  });

  const directory = Buffer.concat(locals.map(({ filename, body, offset: localOffset }) => {
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    return Buffer.concat([central, filename]);
  }));

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals.map(entry => entry.local), directory, end]);
}

function workbook(entries: ZipEntry[] = []): Buffer {
  return zip([
    { name: "[Content_Types].xml", body: Buffer.from("<Types/>") },
    { name: "_rels/.rels", body: Buffer.from("<Relationships/>") },
    { name: "xl/workbook.xml", body: Buffer.from("<workbook/>") },
    { name: "xl/worksheets/sheet1.xml", body: Buffer.from("<worksheet><f>SUM(A1:A2)</f></worksheet>") },
    ...entries,
  ]);
}

function legacyWorkbook(valid = true): Buffer {
  const bytes = Buffer.alloc(1024);
  Buffer.from("d0cf11e0a1b11ae1", "hex").copy(bytes, 0);
  bytes.writeUInt16LE(0xfffe, 28);
  bytes.writeUInt16LE(9, 30);
  if (valid) {
    const name = Buffer.from("Workbook\0", "utf16le");
    name.copy(bytes, 512);
    bytes.writeUInt16LE(name.length, 512 + 64);
    bytes[512 + 66] = 2; // directory entry type: stream
  }
  return bytes;
}

const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n");

beforeAll(() => {
  vi.stubEnv("DATA_ROOM_ENCRYPTION_KEY", "unit-test-only-strong-encryption-secret-never-for-deployment");
});

afterAll(() => vi.unstubAllEnvs());

describe("data-room spreadsheet upload validation", () => {
  it("accepts a complete XLSX directory containing package, relationships, workbook, and worksheet entries", () => {
    const bytes = workbook();

    expect(decodeRoomDocument(bytes.toString("base64"), "financial-model.XLSX")).toEqual({
      bytes,
      kind: "xlsx",
      mimeType: ROOM_FILE_MIME.xlsx,
    });
  });

  it("rejects a plain ZIP, extension/content mismatch, malformed ZIP, and macro-enabled workbook payload", () => {
    const plainZip = zip([{ name: "notes.txt", body: Buffer.from("not a workbook") }]);
    const validWorkbook = workbook();
    const truncated = validWorkbook.subarray(0, -8);
    const withMacro = workbook([{ name: "xl/vbaProject.bin", body: Buffer.from("macro") }]);

    expect(() => decodeRoomDocument(plainZip.toString("base64"), "notes.xlsx")).toThrow(/complete PDF or Excel workbook/i);
    expect(() => decodeRoomDocument(validWorkbook.toString("base64"), "financials.pdf")).toThrow(/complete PDF or Excel workbook/i);
    expect(() => decodeRoomDocument(truncated.toString("base64"), "financials.xlsx")).toThrow(/complete PDF or Excel workbook/i);
    expect(() => decodeRoomDocument(withMacro.toString("base64"), "financials.xlsx")).toThrow(/complete PDF or Excel workbook/i);
  });

  it("enforces decoded-size and canonical-base64 limits before accepting document bytes", () => {
    const tooLarge = Buffer.alloc(MAX_DOCUMENT_BYTES + 1).toString("base64");
    const validWorkbook = workbook().toString("base64");

    expect(() => decodeRoomDocument(tooLarge, "financials.xlsx")).toThrow(/up to 15 MB/i);
    expect(() => decodeRoomDocument(validWorkbook + "=", "financials.xlsx")).toThrow(/up to 15 MB/i);
    expect(() => decodeRoomDocument("not base64!", "financials.xlsx")).toThrow(/up to 15 MB/i);
  });

  it("accepts a legacy OLE XLS Workbook stream and rejects an OLE container without one", () => {
    const valid = legacyWorkbook();
    const invalid = legacyWorkbook(false);

    expect(decodeRoomDocument(valid.toString("base64"), "legacy.xls")).toEqual({
      bytes: valid,
      kind: "xls",
      mimeType: ROOM_FILE_MIME.xls,
    });
    expect(() => decodeRoomDocument(invalid.toString("base64"), "legacy.xls")).toThrow(/complete PDF or Excel workbook/i);
  });

  it("keeps XLSX formula bytes intact through the private document encryption round trip", () => {
    const bytes = workbook();
    const encrypted = encryptDocument(bytes);

    expect(encrypted.includes(Buffer.from("SUM(A1:A2)"))).toBe(false);
    expect(decryptDocument(encrypted)).toEqual(bytes);
    expect(decryptDocument(encrypted).includes(Buffer.from("<f>SUM(A1:A2)</f>"))).toBe(true);
  });

  it("retains the existing complete-PDF validation behavior", () => {
    expect(decodeRoomDocument(pdf.toString("base64"), "teaser.pdf")).toMatchObject({
      bytes: pdf,
      kind: "pdf",
      mimeType: ROOM_FILE_MIME.pdf,
    });
  });
});
