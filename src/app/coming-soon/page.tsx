import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Coming Soon | Way2Investing",
  description: "Way2Investing is coming soon. We are completing testing and analysis before launch.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="relative isolate flex min-h-svh flex-1 flex-col items-center justify-center overflow-hidden bg-[#072c27] px-6 py-16 text-center text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[36rem] w-[54rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="w-full max-w-2xl">
        <Image
          src="/brand/way2investing-logo-filled-white.png"
          alt="Way2Investing — Invest with clarity"
          width={1603}
          height={460}
          priority
          className="mx-auto mb-14 h-auto w-full max-w-[360px]"
        />
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/5 px-4 py-2 text-xs font-medium tracking-[0.15em] text-emerald-200 uppercase">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Preparing for launch
        </p>
        <h1 className="brand-display text-5xl font-semibold tracking-tight sm:text-7xl">Coming soon.</h1>
        <p className="mx-auto mt-7 max-w-lg text-lg leading-8 text-emerald-50/75">
          Clarity is worth the wait. We’re completing testing and analysis to get Way2Investing ready for you.
        </p>
        <div className="mx-auto mt-10 h-px w-16 bg-emerald-300/40" />
        <p className="mt-8 text-sm leading-6 text-emerald-50/55">Thank you for your patience. We look forward to welcoming you.</p>
      </div>
    </main>
  );
}
