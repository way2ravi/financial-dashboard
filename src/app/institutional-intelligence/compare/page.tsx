import { ownerPage } from "@/modules/institutional-intelligence/server/page";
import { IntelligenceDashboard } from "@/modules/institutional-intelligence/ui/Dashboard";
export default async function CompareResearch() {
  return (
    <IntelligenceDashboard initial={await ownerPage()} initialTab="Compare" />
  );
}
