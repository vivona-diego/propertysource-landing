import { useEffect } from "react";

export const DATA_ROOM_LOGO = "/manus-storage/Property_Hub_Exchange_Clean_Corners_1a5f870b.webp";
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const DOCUMENT_CATEGORIES = [
  "Company overview",
  "Financials",
  "Agreements",
  "Supporting documents",
] as const;

export type DataRoomDocument = {
  id: number;
  title: string;
  description: string;
  category: string;
  filename: string;
  sizeBytes: number;
  version: number;
  published: boolean;
  allowDownload: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DataRoomActivity = {
  id: number;
  actor: string;
  event: string;
  detail: string;
  createdAt: number;
};

export type DataRoomInvestor = {
  id: number;
  name: string;
  email: string;
  status: "invited" | "active" | "revoked";
  expiresAt: number | null;
  createdAt: number;
  lastLoginAt: number | null;
};

/** Apply room-only metadata without leaving it behind when the public site returns. */
export function useDataRoomMetadata(title: string) {
  useEffect(() => {
    const priorTitle = document.title;
    const existingRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobotsContent = existingRobots?.getAttribute("content") ?? null;
    const robots = existingRobots ?? document.createElement("meta");
    const createdRobots = !existingRobots;

    if (createdRobots) {
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    document.title = title;
    robots.content = "noindex, nofollow";

    return () => {
      document.title = priorTitle;
      if (createdRobots) {
        robots.remove();
      } else if (previousRobotsContent === null) {
        robots.removeAttribute("content");
      } else {
        robots.setAttribute("content", previousRobotsContent);
      }
    };
  }, [title]);
}

export function formatDataRoomDate(value: number | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, options ?? {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDocumentSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toDateTimeLocal(value: number | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function dateTimeLocalToUtc(value: string) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export type DocumentKind = "pdf" | "xlsx" | "xls";

/** Determine the supported document type from its filename. */
export function documentKind(filename: string): DocumentKind | null {
  const normalizedFilename = filename.trim().toLocaleLowerCase();
  if (normalizedFilename.endsWith(".xlsx")) return "xlsx";
  if (normalizedFilename.endsWith(".xls")) return "xls";
  if (normalizedFilename.endsWith(".pdf")) return "pdf";
  return null;
}

export function readDocumentAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("The selected file could not be read."));
        return;
      }
      const separator = result.indexOf(",");
      resolve(separator >= 0 ? result.slice(separator + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

/** @deprecated Use readDocumentAsBase64 for all supported room documents. */
export const readPdfAsBase64 = readDocumentAsBase64;

export function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase() || "PH";
}
