import Link from "next/link";

type Props = {
  current:
    | "home"
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
  { key: "home", label: "Home", href: "/" },
  { key: "stock", label: "Stock research", href: "/stock" },
  { key: "screener", label: "Screens", href: "/screener" },
  { key: "dashboard", label: "Overview", href: "/dashboard" },
  { key: "market", label: "Market", href: "/market" },
  { key: "watchlist", label: "Watchlist", href: "/watchlist" },
  { key: "wealth", label: "Wealth", href: "/wealth" },
  { key: "earnings", label: "Earnings", href: "/earnings" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio" },
] as const;

export function AppNav({ current }: Props) {
  return (
    <nav className="app-navigation" aria-label="Main navigation">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={current === link.key ? "page" : undefined}
          className="app-navigation-link"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
