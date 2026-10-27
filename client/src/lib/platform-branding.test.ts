import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoot = resolve(import.meta.dirname, "../..");

describe("Property Hub Exchange branding", () => {
  it("uses the requested public platform name in the page title and social metadata", () => {
    const html = readFileSync(resolve(clientRoot, "index.html"), "utf8");
    expect(html).toMatch(/<title>Property Hub Exchange\s*\|/);
    expect(html).toContain('property="og:site_name" content="Property Hub Exchange"');
    expect(html).not.toMatch(/Property\s+Source(?:\s+Exchange)?/i);
  });
});
