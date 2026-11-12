export function getSiteOrigin(configuredUrl: string | undefined, requestOrigin: string | null) {
  const value = configuredUrl?.trim() || requestOrigin;

  if (!value) {
    throw new Error("Set NEXT_PUBLIC_SITE_URL to your website URL before sending confirmation emails.");
  }

  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a website origin, for example https://example.com.");
  }

  return url.origin;
}
