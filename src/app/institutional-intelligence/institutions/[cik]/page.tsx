import { notFound } from "next/navigation";
import { ownerPage } from "@/modules/institutional-intelligence/server/page";
import { IntelligenceDashboard } from "@/modules/institutional-intelligence/ui/Dashboard";
export default async function InstitutionResearch({
  params,
}: {
  params: Promise<{ cik: string }>;
}) {
  const data = await ownerPage(),
    cik = (await params).cik;
  if (!/^\d{10}$/.test(cik)) notFound();
  return <IntelligenceDashboard initial={data} focusInstitution={cik} />;
}
