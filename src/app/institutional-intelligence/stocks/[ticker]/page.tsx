import { notFound } from "next/navigation";
import { ownerPage } from "@/modules/institutional-intelligence/server/page";
import { IntelligenceDashboard } from "@/modules/institutional-intelligence/ui/Dashboard";
export default async function StockResearch({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const data = await ownerPage(),
    ticker = (await params).ticker.toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker)) notFound();
  return <IntelligenceDashboard initial={data} focusTicker={ticker} />;
}
