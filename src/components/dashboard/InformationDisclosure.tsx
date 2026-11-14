import Link from "next/link";
import { informationDisclosure } from "@/lib/content/policy";

export function InformationDisclosure() {
  return <aside className="border-t app-border-soft px-4 py-4 text-xs leading-5 app-muted">
    <div className="mx-auto max-w-7xl">
      <p>{informationDisclosure}</p>
      <div className="mt-1 flex gap-4"><Link href="/risk-disclosure" className="underline">Risk Disclosure</Link><Link href="/terms" className="underline">Terms of Use</Link></div>
    </div>
  </aside>;
}
