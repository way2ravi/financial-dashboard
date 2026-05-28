import { createClient } from "@/lib/supabase/server";
import { AdminRefreshButton } from "./AdminRefreshButton";

type Props = {
  symbol: string;
};

export async function AdminRefreshControl({ symbol }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return null;
  }

  return <AdminRefreshButton symbol={symbol} />;
}
