/** Set COMING_SOON_MODE=false and redeploy to reopen the dashboard. */
export function isComingSoonMode(host: string | null) {
  const hostname = host?.toLowerCase().split(":")[0].replace(/\.$/, "");
  return (
    process.env.COMING_SOON_MODE !== "false" &&
    (hostname === "way2investing.com" || hostname === "www.way2investing.com")
  );
}
