import Link from "next/link";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { BrandMark } from "@/components/dashboard/BrandMark";
import { AppNav } from "@/components/dashboard/AppNav";
import { TickerSearch } from "@/components/dashboard/TickerSearch";

const suggestions = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
];

export default function Home() {
  return (
    <main className="home-screen app-bg">
      <header className="home-header">
        <AppNav current="home" />
        <AuthStatus />
      </header>

      <section className="home-search" aria-labelledby="home-title">
        <div className="home-search-inner">
          <h1 id="home-title"><BrandMark hero /></h1>
          <p className="mt-5 text-sm app-muted">Stock research. Portfolio insights. Invest with clarity.</p>
          <div className="mt-8 w-full text-left">
            <TickerSearch initialSymbol="" />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="mr-1 app-soft">Explore</span>
            {suggestions.map((ticker) => (
              <Link
                key={ticker.symbol}
                href={`/stock?symbol=${ticker.symbol}&autoload=1`}
                prefetch={false}
                className="stock-shortcut"
              >
                {ticker.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <Link href="/" className="text-base font-semibold app-heading">Way2Investing</Link>
          <p className="mt-2 text-xs app-muted">Invest with clarity.</p>
        </div>
        <nav aria-label="Research" className="space-y-2 text-xs">
          <p className="mb-3 font-semibold app-heading">Research</p>
          <Link className="block app-muted" href="/screener">Stock screener</Link>
          <Link className="block app-muted" href="/market">Market overview</Link>
          <Link className="block app-muted" href="/earnings">Earnings calendar</Link>
        </nav>
        <nav aria-label="Your investments" className="space-y-2 text-xs">
          <p className="mb-3 font-semibold app-heading">Your investments</p>
          <Link className="block app-muted" href="/dashboard">Personal overview</Link>
          <Link className="block app-muted" href="/portfolio">Portfolio</Link>
          <Link className="block app-muted" href="/wealth">Wealth</Link>
        </nav>
      </footer>
    </main>
  );
}
