import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ResearchClient } from "./db";

export class ResearchAccessError extends Error {
  constructor(public status: number) {
    super(
      status === 401
        ? "Sign in is required."
        : "Private research access denied.",
    );
  }
}
export class ResearchInputError extends Error {}
export function matchesOwner(
  user: { id: string; email?: string; email_confirmed_at?: string },
  configuredEmail = process.env.INSTITUTIONAL_OWNER_EMAIL,
  configuredId = process.env.INSTITUTIONAL_OWNER_USER_ID,
) {
  if (!user.email_confirmed_at) return false;
  if (!configuredEmail && !configuredId) return false;
  if (configuredId && user.id !== configuredId) return false;
  return (
    !configuredEmail ||
    user.email?.toLowerCase() === configuredEmail.trim().toLowerCase()
  );
}
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new ResearchAccessError(401);
  if (!matchesOwner(user)) throw new ResearchAccessError(403);
  const client = supabase as unknown as ResearchClient;
  const { data: allowed, error: ownerError } = await client.rpc("ii_is_owner");
  if (ownerError || allowed !== true) throw new ResearchAccessError(403);
  return { client, user };
}
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  Vary: "Cookie",
};
export function privateError(error: unknown) {
  const status = error instanceof ResearchAccessError ? error.status : error instanceof ResearchInputError ? 400 : 503;
  return Response.json(
    {
      error:
        status === 503
          ? "Research data is temporarily unavailable. Check the private ingestion log."
          : (error as Error).message,
    },
    { status, headers: privateHeaders },
  );
}
