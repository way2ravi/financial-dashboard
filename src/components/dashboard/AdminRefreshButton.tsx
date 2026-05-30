"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type RefreshResult = {
  module: string;
  status: "success" | "error";
  updated: number;
  error?: string;
};

type RefreshSummary = {
  failed: number;
  succeeded: number;
  totalModules: number;
  updated: number;
};

type Props = {
  symbol: string;
};

const quickModules = ["quote", "ohlc"];
const fullModules = [
  "profile",
  "quote",
  "analystRatings",
  "priceTargets",
  "earnings",
  "fundamentals",
  "ohlc",
  "news",
];

export function AdminRefreshButton({ symbol }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshingMode, setRefreshingMode] = useState<"quick" | "full" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isRefreshing = isPending || refreshingMode !== null;

  async function refresh(mode: "quick" | "full") {
    setMessage(null);
    setRefreshingMode(mode);

    try {
      const response = await fetch(`/api/admin/refresh/${symbol}`, {
        method: "POST",
        body: JSON.stringify({ modules: mode === "quick" ? quickModules : fullModules }),
      });
      const body = (await response.json()) as {
        data?: { results?: RefreshResult[]; summary?: RefreshSummary };
        error?: string;
      };

      if (!response.ok) {
        setMessage(body.error ?? "Refresh failed");
        return;
      }

      const summary = body.data?.summary;
      const results = body.data?.results ?? [];
      const failures =
        summary?.failed ?? results.filter((result) => result.status === "error").length;
      const updated =
        summary?.updated ??
        results.reduce((total, result) => total + result.updated, 0);

      setMessage(
        failures
          ? `${updated} rows updated, ${failures} module failed`
          : mode === "quick"
            ? `${updated} rows updated (quote + chart)`
            : `${updated} rows updated (full refresh)`
      );
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setRefreshingMode(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex overflow-hidden rounded-lg border border-[color:var(--border)]">
        <button
          type="button"
          onClick={() => refresh("quick")}
          disabled={isRefreshing}
          className="h-10 app-accent-button px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {refreshingMode === "quick" ? "Refreshing" : "Quick"}
        </button>
        <button
          type="button"
          onClick={() => refresh("full")}
          disabled={isRefreshing}
          className="h-10 app-secondary-button border-l border-[color:var(--border)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {refreshingMode === "full" ? "Refreshing" : "Full"}
        </button>
      </div>
      {message ? <p className="max-w-52 text-right text-xs app-muted">{message}</p> : null}
    </div>
  );
}
