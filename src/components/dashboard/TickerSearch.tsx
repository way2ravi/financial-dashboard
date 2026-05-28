"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Ticker } from "@/lib/types";

type Props = {
  initialSymbol: string;
};

export function TickerSearch({ initialSymbol }: Props) {
  const router = useRouter();
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

  function navigateToSymbol(symbol = normalizedQuery) {
    const nextSymbol = symbol.trim().toUpperCase();

    if (!nextSymbol) {
      return;
    }

    setIsOpen(false);
    router.push(`/dashboard?symbol=${encodeURIComponent(nextSymbol)}`);
  }

  function updateQuery(value: string) {
    setQuery(value.toUpperCase());
    setError(null);
    setIsOpen(true);
  }

  return (
    <form
      ref={containerRef}
      action="/dashboard"
      className="relative flex w-full max-w-sm flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        navigateToSymbol();
      }}
    >
      <label htmlFor="ticker-symbol" className="text-sm font-medium app-muted">
        Ticker
      </label>
      <div className="flex gap-2">
        <input
          id="ticker-symbol"
          name="symbol"
          className="h-10 min-w-0 flex-1 rounded-lg border app-input px-3 text-base font-semibold uppercase outline-none"
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
        <button
          type="submit"
          className="h-10 rounded-lg app-primary-button px-4 text-sm font-semibold"
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
            <div className="px-3 py-2 text-sm app-muted">Searching</div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-[var(--app-negative)]">{error}</div>
          ) : visibleResults.length > 0 ? (
            visibleResults.map((ticker) => (
              <button
                key={ticker.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 border-b app-border-soft px-3 py-2 text-left last:border-b-0 hover:bg-[var(--app-subtle)]"
                role="option"
                aria-selected={ticker.symbol === normalizedQuery}
                onClick={() => navigateToSymbol(ticker.symbol)}
              >
                <span className="min-w-0">
                  <span className="block font-semibold app-heading">{ticker.symbol}</span>
                  <span className="block truncate text-xs app-muted">{ticker.name}</span>
                </span>
                <span className="shrink-0 text-xs app-muted">{ticker.exchange}</span>
              </button>
            ))
          ) : normalizedQuery ? (
            <div className="px-3 py-2 text-sm app-muted">No matching tickers</div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
