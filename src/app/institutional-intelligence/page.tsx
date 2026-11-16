import { ownerPage } from "@/modules/institutional-intelligence/server/page";
import { IntelligenceDashboard } from "@/modules/institutional-intelligence/ui/Dashboard";
import type { Tab } from "@/modules/institutional-intelligence/ui/Dashboard";
export default async function InstitutionalPage({searchParams}:{searchParams:Promise<{tab?:string}>}) {
  const data=await ownerPage();
  const requested=(await searchParams).tab;
  const allowed:Tab[]=["Overview","Watchlist","Filings","Alerts","Compare","Methodology","Configuration"];
  const initialTab=allowed.find(tab=>tab===requested) ?? "Overview";
  return <IntelligenceDashboard initial={data} initialTab={initialTab} />;
}
