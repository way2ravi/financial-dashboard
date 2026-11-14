import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentPolicy, requireContentAdmin } from "@/lib/content/settings";
import { defaultSettings, normalizeSettings, recommendationFeatures, type ComplianceApproval } from "@/lib/content/policy";
import { saveContentSettings } from "./actions";

export const dynamic = "force-dynamic";
const labels = {
  recommendationsEnabled: "Enable AI Investment Recommendations",
  buySellSignalsEnabled: "Enable Buy/Sell/Hold Signals",
  stopLossRecommendationsEnabled: "Enable Recommended Stop-Loss",
  takeProfitRecommendationsEnabled: "Enable Recommended Take-Profit / Limit",
  entryPriceRecommendationsEnabled: "Enable Recommended Entry Prices",
  stockRankingsEnabled: "Enable AI Stock Rankings as Investment Picks",
  personalisedAdviceEnabled: "Enable Personalised Investment Recommendations",
  informationalAnalysisEnabled: "Enable Informational Technical Analysis",
  financialNewsEnabled: "Enable Financial News and Market Analysis",
};

export default async function ContentSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const client = await requireContentAdmin().catch(() => null);
  if (!client) notFound();
  const { data: row, error } = await client.from("ai_content_controls").select("*").eq("id", 1).maybeSingle();
  const { data: audit } = await client.from("ai_content_audit").select("*").order("id", { ascending: false }).limit(15);
  const policy = await getContentPolicy();
  const settings = normalizeSettings(row?.settings);
  const approval = row?.approval as ComplianceApproval | null;
  const query = await searchParams;
  const input = "mt-1 w-full rounded border app-input px-3 py-2 text-sm";
  return <main className="min-h-screen app-bg">
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard" className="text-sm underline app-muted">Personal Overview</Link>
      <h1 className="mt-5 text-2xl font-semibold app-heading">AI Recommendations &amp; Content Controls</h1>
      <p className="mt-2 text-sm app-muted">Public status: {policy.recommendationsEnabled ? "Approved recommendation features active" : "Information Only Mode"}</p>
      {query.saved ? <p role="status" className="mt-4 app-positive">Settings saved and page caches invalidated.</p> : null}
      {query.error ? <p role="alert" className="mt-4 app-negative">{query.error.slice(0, 250)}</p> : null}
      {error || !row ? <p role="alert" className="mt-6 app-negative">Settings are unavailable. Information Only Mode remains active. Apply the content controls database migration before saving.</p> :
        <form action={saveContentSettings} className="mt-6 space-y-8">
          <input type="hidden" name="revision" value={row.revision} />
          <fieldset><legend className="text-base font-semibold app-heading">Content Settings</legend>
            <div className="mt-3 divide-y app-border-soft">{Object.keys(defaultSettings).map(key => <label key={key} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>{labels[key as keyof typeof labels]}</span>
              <input type="checkbox" role="switch" name={key} defaultChecked={settings[key as keyof typeof settings]} className="h-5 w-5 shrink-0 accent-emerald-600" />
            </label>)}</div>
          </fieldset>
          <fieldset className="border-t app-border-soft pt-5"><legend className="text-base font-semibold app-heading">Regulatory Approval Record</legend>
            <p className="mt-2 text-xs leading-5 app-muted">A switch alone does not authorise public recommendations. Record independently verified approval, applicable jurisdiction, evidence and an expiry. These records are not a substitute for legal review.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">Review status<select name="status" defaultValue={approval?.status ?? "pending"} className={input}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
              <label className="text-sm">Approver identity<input name="approverIdentity" defaultValue={approval?.approverIdentity ?? ""} maxLength={2000} className={input} /></label>
              <label className="text-sm">Approval date (UTC)<input type="datetime-local" name="approvedAt" defaultValue={approval?.approvedAt?.slice(0, 16) ?? ""} className={input} /></label>
              <label className="text-sm">Review expiry (UTC)<input type="datetime-local" name="expiresAt" defaultValue={approval?.expiresAt?.slice(0, 16) ?? ""} className={input} /></label>
              <label className="text-sm">Applicable jurisdiction<input name="jurisdiction" defaultValue={approval?.jurisdiction ?? ""} maxLength={2000} className={input} /></label>
              <label className="text-sm">Approval evidence / reference<input name="evidence" defaultValue={approval?.evidence ?? ""} maxLength={2000} className={input} /></label>
            </div>
            <div className="mt-4 space-y-2">{recommendationFeatures.map(key => <label key={key} className="flex items-start gap-2 text-sm"><input type="checkbox" name={`approval_${key}`} defaultChecked={approval?.approvedFeatures?.includes(key) ?? false} className="mt-1 accent-emerald-600" />{labels[key]}</label>)}</div>
          </fieldset>
          <button type="submit" className="rounded app-primary-button px-5 py-2 text-sm font-semibold">Save settings</button>
        </form>}
      <section className="mt-10 border-t app-border-soft pt-5"><h2 className="text-base font-semibold app-heading">Audit History</h2>
        {!audit?.length ? <p className="mt-2 text-sm app-muted">No recorded changes.</p> : <div className="mt-3 space-y-3">{audit.map(item => <details key={item.id} className="border-b app-border-soft pb-3 text-xs"><summary className="cursor-pointer break-words">{item.changed_at} - {item.actor_identity}</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify({ old: item.old_value, new: item.new_value }, null, 2)}</pre></details>)}</div>}
      </section>
    </div>
  </main>;
}
