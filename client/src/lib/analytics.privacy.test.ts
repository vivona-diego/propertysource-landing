import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeGoogleAnalytics } from "./analytics";
let appended: unknown[];
beforeEach(() => {
  appended = [];
  vi.stubGlobal("window", { location: { pathname: "/" } });
  vi.stubGlobal("document", {
    createElement: () => ({}),
    head: { appendChild: (tag: unknown) => appended.push(tag) },
  });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe("analytics privacy for the GitHub deployment", () => {
  it.each(["/data-room", "/data-room/admin", "/data-room/invite"])("does not load analytics on %s", pathname => {
    window.location.pathname = pathname;
    initializeGoogleAnalytics("G-9661Q40LRG", true);
    expect(appended).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });
  it("initializes the approved public-site measurement ID exactly once", () => {
    initializeGoogleAnalytics("G-9661Q40LRG", true);
    initializeGoogleAnalytics("G-9661Q40LRG", true);
    expect(appended).toHaveLength(1);
    expect(window.propertySourceAnalyticsId).toBe("G-9661Q40LRG");
    expect(window.dataLayer).toHaveLength(2);
  });
  it("does not initialize a disabled preview measurement ID", () => {
    initializeGoogleAnalytics("disabled", true);
    expect(appended).toHaveLength(0);
  });
});
