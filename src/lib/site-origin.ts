/** True for an origin like https://example.com with no path, query, or credentials. */
export function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.origin === value &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

/**
 * Prefer NEXT_PUBLIC_SITE_URL. Otherwise use the browser origin passed in.
 * Never invent a localhost URL.
 */
export function resolveSiteOrigin(browserOrigin?: string | null): string | null {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (isHttpOrigin(configured)) return configured;
  const fromBrowser = (browserOrigin ?? "").trim().replace(/\/$/, "");
  if (isHttpOrigin(fromBrowser)) return fromBrowser;
  return null;
}
