"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Ticker } from "@/lib/types";
import { TickerLogo } from "./TickerLogo";

type Props = {
  initialSymbol: string;
};

export function TickerSearch({ initialSymbol }: Props) {
  const containerRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState(initialSymbol);
  const [results, setResults] = useState<Ticker[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = useMemo(() => query.trim().toUpperCase(), [query]);
  const visibleResults = normalizedQuery ? results : [];

  useEffect(() => {
    if (normalizedQuery.length < 1) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/tickers/search?query=${encodeURIComponent(normalizedQuery)}&limit=6`,
          { signal: controller.signal }
        );
        const body = (await response.json()) as { data?: Ticker[]; error?: string };

        if (!response.ok) {
          throw new Error(body.error ?? "Search failed");
        }

        setResults(body.data ?? []);
      } catch (searchError) {
        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
        setError(searchError instanceof Error ? searchError.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function updateQuery(value: string) {
    setQuery(value.toUpperCase());
    setError(null);
    setIsOpen(true);
  }

  return (
    <form
      ref={containerRef}
      action="/dashboard"
      method="get"
      className="relative flex w-full max-w-sm flex-col gap-1"
      onSubmit={() => setIsOpen(false)}
    >
      <label htmlFor="ticker-symbol" className="text-xs font-medium app-muted">
        Ticker
      </label>
      <div className="flex gap-2">
        <input
          id="ticker-symbol"
          name="symbol"
          className="h-9 min-w-0 flex-1 rounded-lg border app-input px-3 text-sm font-semibold uppercase outline-none"
          value={query}
          maxLength={12}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="ticker-search-results"
          onChange={(event) => updateQuery(event.target.value)}
          onInput={(event) => updateQuery(event.currentTarget.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
        />
        <input type="hidden" name="autoload" value="1" />
        <button
          type="submit"
          className="h-9 rounded-lg app-primary-button px-4 text-xs font-semibold"
        >
          Load
        </button>
      </div>

      {isOpen ? (
        <div
          id="ticker-search-results"
          className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border app-surface shadow-xl"
          role="listbox"
        >
          {isLoading ? (
            <div className="px-3 py-2 text-xs app-muted">Searching</div>
          ) : error ? (
            <div className="px-3 py-2 text-xs text-[var(--app-negative)]">{error}</div>
          ) : visibleResults.length > 0 ? (
            visibleResults.map((ticker) => (
              <Link
                key={ticker.id}
                href={`/dashboard?symbol=${encodeURIComponent(ticker.symbol)}&autoload=1`}
                className="flex w-full items-start justify-between gap-3 border-b app-border-soft px-3 py-2 text-left last:border-b-0 hover:bg-[var(--app-subtle)]"
                role="option"
                aria-selected={ticker.symbol === normalizedQuery}
                onClick={() => setIsOpen(false)}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <TickerLogo ticker={ticker} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-semibold app-heading">{ticker.symbol}</span>
                    <span className="block truncate text-xs app-muted">{ticker.name}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs app-muted">{ticker.exchange}</span>
              </Link>
            ))
          ) : normalizedQuery ? (
            <Link
              href={`/dashboard?symbol=${encodeURIComponent(normalizedQuery)}&autoload=1`}
              className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--app-subtle)]"
              role="option"
              aria-selected="false"
              onClick={() => setIsOpen(false)}
            >
              <span>
                <span className="block font-semibold app-heading">{normalizedQuery}</span>
                <span className="block text-xs app-muted">Open typed symbol</span>
              </span>
              <span className="shrink-0 text-xs app-muted">Load</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
