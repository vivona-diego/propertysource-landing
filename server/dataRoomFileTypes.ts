export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export type RoomFileKind = "pdf" | "xlsx" | "xls";
export const ROOM_FILE_MIME = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
} as const;

export function roomFileKind(filename: string): RoomFileKind {
  const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  if (!["pdf", "xlsx", "xls"].includes(extension) || !filename.includes(".")) throw new Error("Choose a PDF or Excel (.xlsx or .xls) file, up to 15 MB.");
  return extension as RoomFileKind;
}

/** Validate the ZIP directory only. Never inflate or execute uploaded workbooks. */
function isXlsx(bytes: Buffer) {
  if (bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50) return false;
  let end = -1;
  for (let pos = bytes.length - 22; pos >= Math.max(0, bytes.length - 65557); pos--) {
    if (bytes.readUInt32LE(pos) === 0x06054b50 && pos + 22 + bytes.readUInt16LE(pos + 20) === bytes.length) { end = pos; break; }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) !== 0 || bytes.readUInt16LE(end + 6) !== 0) return false;
  const entries = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), offset = bytes.readUInt32LE(end + 16);
  if (!entries || entries > 4096 || entries !== bytes.readUInt16LE(end + 8) || offset + size !== end) return false;
  const names = new Set<string>();
  let cursor = offset, expandedBytes = 0;
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) return false;
    const flags = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20), expandedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28), extraLength = bytes.readUInt16LE(cursor + 30), commentLength = bytes.readUInt16LE(cursor + 32);
    const next = cursor + 46 + nameLength + extraLength + commentLength, local = bytes.readUInt32LE(cursor + 42);
    if (!nameLength || next > end || (flags & 1) || ![0, 8].includes(method) || local + 30 > offset || bytes.readUInt32LE(local) !== 0x04034b50) return false;
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    const localNameLength = bytes.readUInt16LE(local + 26), localExtraLength = bytes.readUInt16LE(local + 28);
    if (local + 30 + localNameLength + localExtraLength + compressedSize > offset || bytes.subarray(local + 30, local + 30 + localNameLength).toString("utf8") !== name) return false;
    if (names.has(name) || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..") || /vbaproject\.bin$/i.test(name)) return false;
    expandedBytes += expandedSize;
    if (expandedBytes > 100 * 1024 * 1024) return false;
    names.add(name); cursor = next;
  }
  return cursor === end && names.has("[Content_Types].xml") && names.has("_rels/.rels") && names.has("xl/workbook.xml") && Array.from(names).some(name => /^xl\/worksheets\/[^/]+\.xml$/.test(name));
}

/** Recognize a legacy Compound File workbook stream; files remain download-only. */
function isXls(bytes: Buffer) {
  if (bytes.length < 512 || !bytes.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex")) || bytes.readUInt16LE(28) !== 0xfffe || ![9, 12].includes(bytes.readUInt16LE(30))) return false;
  for (const name of ["Workbook", "Book"]) {
    const encoded = Buffer.from(name + "\0", "utf16le");
    for (let position = bytes.indexOf(encoded, 512); position >= 0; position = bytes.indexOf(encoded, position + encoded.length)) {
      if (position % 128 === 0 && position + 128 <= bytes.length && bytes.readUInt16LE(position + 64) === encoded.length && bytes[position + 66] === 2) return true;
    }
  }
  return false;
}

export function decodeRoomDocument(base64: string, filename: string) {
  const kind = roomFileKind(filename);
  if (base64.length > Math.ceil(MAX_DOCUMENT_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error("Choose a PDF or Excel file, up to 15 MB.");
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES || bytes.toString("base64") !== base64) throw new Error("Choose a PDF or Excel file, up to 15 MB.");
  const valid = kind === "pdf" ? bytes.length >= 16 && bytes.subarray(0, 5).toString() === "%PDF-" && bytes.subarray(-2048).toString("latin1").includes("%%EOF") : kind === "xlsx" ? isXlsx(bytes) : isXls(bytes);
  if (!valid) throw new Error("The file content must match a complete PDF or Excel workbook (.xlsx or .xls). Password-encrypted Excel files are not supported.");
  return { bytes, kind, mimeType: ROOM_FILE_MIME[kind] };
}
