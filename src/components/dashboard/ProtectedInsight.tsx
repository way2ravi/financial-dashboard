import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  isAuthenticated: boolean;
  message?: string;
  title?: string;
};

export function ProtectedInsight({
  children,
  isAuthenticated,
  message = "Sign in to view live figures, analysis, and detailed signals.",
  title = "Member insight locked",
}: Props) {
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div
        className="grid gap-2 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--app-primary)_8%,transparent),color-mix(in_srgb,var(--app-teal)_10%,transparent))] p-4"
        aria-hidden="true"
      >
        <div className="h-3 w-32 rounded-full bg-[color-mix(in_srgb,var(--app-primary)_16%,transparent)]" />
        <div className="h-8 w-56 rounded-lg bg-[color-mix(in_srgb,var(--app-teal)_16%,transparent)]" />
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="h-20 rounded-lg app-subtle" />
          <div className="h-20 rounded-lg app-subtle" />
          <div className="h-20 rounded-lg app-subtle" />
        </div>
      </div>
      <div className="border-t app-border-soft px-4 py-3">
        <div className="text-sm font-semibold app-heading">{title}</div>
        <p className="mt-1 text-xs leading-5 app-muted">{message}</p>
        <div className="mt-3">
          <Link
            href="/login"
            className="inline-flex rounded-md app-accent-button px-3 py-2 text-xs font-semibold shadow-sm"
          >
            Sign in to unlock
          </Link>
        </div>
      </div>
    </div>
  );
}
