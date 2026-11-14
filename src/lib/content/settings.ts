import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createClient as createPolicyClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { currentUserIsAdmin } from "@/lib/services/userRoleService";
import { defaultSettings, normalizeSettings, filterContent, type AIContentSettings, type ContentEnvelope } from "./policy";

export async function getContentPolicy(): Promise<AIContentSettings> {
  try {
    // Policy is public, but approval identities and audit records are not.
    // No cookie dependency: the same reader works in requests and background workers.
    const client = createPolicyClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } }
    );
    // RPC has no HTTP/data cache; approval expiry is checked in PostgreSQL on every read.
    const { data, error } = await client.rpc("get_ai_content_policy");
    if (error) return { ...defaultSettings };
    const policy = normalizeSettings(data);
    if (!policy.recommendationsEnabled) {
      return { ...defaultSettings, informationalAnalysisEnabled: policy.informationalAnalysisEnabled, financialNewsEnabled: policy.financialNewsEnabled };
    }
    return policy;
  } catch {
    return { ...defaultSettings };
  }
}

export async function requireContentAdmin() {
  const client = await createClient();
  if (!await currentUserIsAdmin(client)) throw new Error("Administrator access required.");
  return client;
}

export async function prepareContentDelivery<T>(items: ContentEnvelope<T>[]) {
  return filterContent(items, await getContentPolicy());
}
