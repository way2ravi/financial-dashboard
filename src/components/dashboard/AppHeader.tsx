import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { BrandMark } from "@/components/dashboard/BrandMark";

type Props = {
  current:
    | "dashboard"
    | "earnings"
    | "market"
    | "portfolio"
    | "screener"
    | "watchlist"
    | "wealth";
  description?: string;
  title: string;
};

export function AppHeader({ current, description, title }: Props) {
  return (
    <header className="border-b app-brand-header">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <BrandMark />
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1 lg:justify-end">
            <AppNav current={current} />
            <AuthStatus />
          </div>
        </div>

        <div className="border-t border-white/15 pt-4">
          <h1 className="brand-display text-2xl font-bold tracking-normal text-white">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--app-header-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
