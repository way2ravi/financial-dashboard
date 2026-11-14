import Link from "next/link";
export default function TermsPage() {
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-10 text-sm leading-6">
    <Link href="/" className="underline">Way2Investing</Link><h1 className="text-2xl font-semibold">Terms of Use</h1>
    <p>Way2Investing provides financial information, technical analysis and educational research. Access does not create an advisory, fiduciary or brokerage relationship.</p>
    <p>You are responsible for independent verification and your own financial decisions. Information is provided without a guarantee of accuracy, timeliness or future performance. Nothing on the site promises investment returns.</p>
    <p>Protect your account credentials. Do not misuse the service, circumvent access controls or redistribute third-party data without the necessary rights. Features and availability may change.</p>
    <p>These terms do not exclude rights or liabilities that cannot lawfully be excluded. Read the <Link href="/risk-disclosure" className="underline">Risk Disclosure</Link> before using market analysis.</p>
  </main>;
}
