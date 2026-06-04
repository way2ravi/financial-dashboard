import Link from "next/link";

type Props = {
  current:
    | "dashboard"
    | "earnings"
    | "market"
    | "portfolio"
    | "screener"
    | "stock"
    | "watchlist"
    | "wealth";
};

const links = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "stock", label: "Stock", href: "/stock" },
  { key: "market", label: "Market", href: "/market" },
  { key: "watchlist", label: "Watchlist", href: "/watchlist" },
  { key: "wealth", label: "Wealth", href: "/wealth" },
  { key: "earnings", label: "Earnings", href: "/earnings" },
  { key: "screener", label: "Screener", href: "/screener" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio" },
] as const;

export function AppNav({ current }: Props) {
  return (
    <nav className="hidden min-w-0 overflow-x-auto rounded-lg border app-surface p-1 shadow-sm md:flex lg:overflow-visible" aria-label="Main navigation">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={current === link.key ? "page" : undefined}
          className={`h-8 shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition xl:px-3 ${
            current === link.key
              ? "bg-[var(--app-accent)] text-white shadow-sm"
              : "app-muted hover:bg-[color-mix(in_srgb,var(--app-teal)_14%,transparent)] hover:text-[var(--app-primary)]"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
