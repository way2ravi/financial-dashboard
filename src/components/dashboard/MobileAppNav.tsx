"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { key: "dashboard", label: "Home", href: "/dashboard" },
  { key: "market", label: "Market", href: "/market" },
  { key: "watchlist", label: "Watchlist", href: "/watchlist" },
  { key: "wealth", label: "Wealth", href: "/wealth" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio" },
] as const;

const hiddenPrefixes = ["/login", "/auth", "/api"];

export function MobileAppNav() {
  const pathname = usePathname();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--app-border)] bg-white/95 px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(10,58,103,0.12)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-12 min-w-0 items-center justify-center rounded-lg px-1 text-[11px] font-semibold transition ${
                isActive
                  ? "bg-[var(--app-primary)] text-white shadow-sm"
                  : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-primary)]"
              }`}
            >
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
