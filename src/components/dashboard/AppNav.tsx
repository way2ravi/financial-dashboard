import Link from "next/link";

type Props = {
  current:
    | "dashboard"
    | "earnings"
    | "market"
    | "portfolio"
    | "screener"
    | "watchlist"
    | "wealth";
};

const links = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "market", label: "Market", href: "/market" },
  { key: "watchlist", label: "Watchlist", href: "/watchlist" },
  { key: "wealth", label: "Wealth", href: "/wealth" },
  { key: "earnings", label: "Earnings", href: "/earnings" },
  { key: "screener", label: "Screener", href: "/screener" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio" },
] as const;

export function AppNav({ current }: Props) {
  return (
    <nav className="flex rounded-lg border app-surface p-1" aria-label="Main navigation">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={current === link.key ? "page" : undefined}
          className={`h-8 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            current === link.key
              ? "bg-[var(--app-primary)] text-white"
              : "app-muted hover:bg-[var(--app-subtle)] hover:text-[var(--app-heading)]"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
