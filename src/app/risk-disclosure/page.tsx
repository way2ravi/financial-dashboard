import Link from "next/link";
export default function RiskDisclosurePage() {
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-10 text-sm leading-6">
    <Link href="/" className="underline">Way2Investing</Link><h1 className="text-2xl font-semibold">Risk Disclosure</h1>
    <p>Investments can fall as well as rise. You may lose some or all of the money invested. Historical performance, technical levels and analyst estimates do not predict future results.</p>
    <p>Market data may be delayed, incomplete or inaccurate. Technical levels are formula-based observations, not instructions to place orders. Hypothetical price-distance ratios do not account for execution, gaps, fees, taxes or your circumstances.</p>
    <p>Information Only Mode provides market information and educational research, not personalised investment recommendations. Independently verify information and obtain appropriately authorised professional advice where needed.</p>
    <p>Derivatives, leverage, concentrated positions and currency exposure can increase losses. Do not treat a dashboard score, news item or calculation as a suitability assessment.</p>
    <Link href="/terms" className="underline">Terms of Use</Link>
  </main>;
}
