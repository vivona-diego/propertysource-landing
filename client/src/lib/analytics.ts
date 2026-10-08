declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    propertySourceAnalyticsId?: string;
  }
}

// GA4 measurement IDs are public identifiers, not secret credentials.
export const DEFAULT_GA_MEASUREMENT_ID = "G-9661Q40LRG";

export function initializeGoogleAnalytics(
  measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID ?? DEFAULT_GA_MEASUREMENT_ID,
  enabled = import.meta.env.PROD,
): void {
  const id = measurementId.trim();
  // Local development is not tracked. Empty or "disabled" disables tracking.
  if (!enabled || !/^G-[A-Z0-9]+$/.test(id) || window.propertySourceAnalyticsId) return;

  window.propertySourceAnalyticsId = id;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);

  const script = document.createElement("script");
  script.id = "google-analytics-gtag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

initializeGoogleAnalytics();
