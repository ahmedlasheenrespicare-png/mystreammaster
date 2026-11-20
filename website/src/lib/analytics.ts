type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue>;
type Gtag = (command: "event", eventName: string, params: AnalyticsParams) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

/** Send a privacy-safe GA4 interaction without changing the site's measurement ID. */
export function trackSiteEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", eventName, {
    source_path: window.location.pathname,
    ...params,
  });
}

/** Hero engagement events are only counted on the homepage, not on reused widgets. */
export function trackHomeEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined" || window.location.pathname !== "/") return;
  trackSiteEvent(eventName, { placement: "home_hero", ...params });
}
