export const recoveryCallbackPath = "/institutional-intelligence/auth/callback";

export function recoveryOrigin(configured: string | undefined): string {
  if (!configured)
    throw new Error("Private recovery origin is not configured.");
  const url = new URL(configured.trim());
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Private recovery origin must be an HTTPS origin or local loopback origin.",
    );
  }
  return url.origin;
}

export function passwordIsValid(
  password: string,
  confirmation: string,
): boolean {
  return (
    password.length >= 12 &&
    password.length <= 1024 &&
    password === confirmation
  );
}
