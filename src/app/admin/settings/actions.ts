"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContentAdmin } from "@/lib/content/settings";
import { defaultSettings, recommendationFeatures } from "@/lib/content/policy";

export async function saveContentSettings(form: FormData) {
  const client = await requireContentAdmin();
  const settings = Object.fromEntries(Object.keys(defaultSettings).map(key => [key, form.get(key) === "on"]));
  const text = (key: string) => String(form.get(key) ?? "").trim().slice(0, 2000);
  const approval = {
    status: text("status"), approvedAt: text("approvedAt") ? `${text("approvedAt")}Z` : "", expiresAt: text("expiresAt") ? `${text("expiresAt")}Z` : "",
    approverIdentity: text("approverIdentity"), jurisdiction: text("jurisdiction"), evidence: text("evidence"),
    approvedFeatures: recommendationFeatures.filter(key => form.get(`approval_${key}`) === "on"),
  };
  const { error } = await client.rpc("save_ai_content_controls", {
    new_settings: settings, new_approval: approval, expected_revision: Number(form.get("revision")),
  });
  if (error) redirect(`/admin/settings?error=${encodeURIComponent("Settings were not saved. Check approval dates and reload if another administrator has made changes.")}`);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
