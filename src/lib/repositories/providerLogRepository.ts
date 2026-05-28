import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type DbClient = SupabaseClient<Database>;

export async function logProviderFetch(
  supabase: DbClient,
  input: {
    provider: string;
    endpoint: string;
    symbol?: string;
    status: "success" | "error";
    statusCode?: number | null;
    errorMessage?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("provider_fetch_log").insert({
    provider: input.provider,
    endpoint: input.endpoint,
    symbol: input.symbol ?? null,
    status: input.status,
    status_code: input.statusCode ?? null,
    error_message: input.errorMessage ?? null,
  });

  if (error) {
    throw error;
  }
}

