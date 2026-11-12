"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Ticker } from "@/lib/types";
import { TickerLogo } from "./TickerLogo";

type Props = {
  initialSymbol: string;
};

type RecentTicker = Pick<
  Ticker,
  "exchange" | "id" | "logoUrl" | "name" | "sector" | "symbol"
>;

const recentStorageKey = "financial-dashboard-recent-tickers";

const popularTickers: RecentTicker[] = [
  tickerShortcut("NVDA", "NVIDIA Corporation", "NASDAQ", "Equity"),
  tickerShortcut("QQQ", "Invesco QQQ Trust", "NASDAQ", "ETF"),
  tickerShortcut("AAPL", "Apple Inc.", "NASDAQ", "Equity"),
  tickerShortcut("TSLA", "Tesla Inc.", "NASDAQ", "Equity"),
  tickerShortcut("PLTR", "Palantir Technologies", "NASDAQ", "Equity"),
  tickerShortcut("SOFI", "SoFi Technologies", "NASDAQ", "Equity"),
];

export function TickerSearch({ initialSymbol }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState(initialSymbol);
  const [results, setResults] = useState<Ticker[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [recent, setRecent] = useState<RecentTicker[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = useMemo(() => query.trim().toUpperCase(), [query]);
  const visibleResults = normalizedQuery && resultsQuery === normalizedQuery ? results : [];
  const hasTypedQuery = normalizedQuery.length > 0;
  const suggestionGroups = hasTypedQuery
    ? [{ title: "Search Results", items: visibleResults }]
    : [
        { title: "My Recent Searches", items: recent },
        { title: "Popular Searches", items: popularTickers },
      ];

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
          `/api/tickers/search?query=${encodeURIComponent(normalizedQuery)}&limit=8`,
          { signal: controller.signal }
        );
        const body = (await response.json()) as { data?: Ticker[]; error?: string };

        if (!response.ok) {
          throw new Error(body.error ?? "Search failed");
        }

        setResults(body.data ?? []);
        setResultsQuery(normalizedQuery);
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
    const nextQuery = value;

    setQuery(nextQuery);
    setError(null);
    setIsOpen(true);

    if (!nextQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      setRecent(readRecentTickers());
    }
  }

  function openSearch() {
    setRecent(readRecentTickers());
    setIsOpen(true);
  }

  function rememberTicker(ticker: RecentTicker) {
    const next = [
      toRecentTicker(ticker),
      ...recent.filter((item) => item.symbol !== ticker.symbol),
    ].slice(0, 6);

    setRecent(next);
    writeRecentTickers(next);
    setIsOpen(false);
  }

  return (
    <form
      ref={containerRef}
      action="/stock"
      method="get"
      className="relative w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (normalizedQuery) {
          const selected = visibleResults[0] ?? tickerShortcut(normalizedQuery, `${normalizedQuery} ticker`, null, null);
          rememberTicker(selected);
          router.push(`/stock?symbol=${encodeURIComponent(selected.symbol)}&autoload=1`);
        }
      }}
    >
      <label htmlFor="ticker-symbol" className="sr-only">
        Search ticker
      </label>
      <div className="flex h-10 items-center overflow-hidden rounded-lg border app-input focus-within:border-[var(--app-primary)]">
        <input
          id="ticker-symbol"
          name="symbol"
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
          value={query}
          maxLength={80}
          required
          autoComplete="off"
          placeholder="Search for a company or ticker"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="ticker-search-results"
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={openSearch}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
        />
        <input type="hidden" name="autoload" value="1" />
        <button type="submit" aria-label="Search stocks" title="Search stocks" className="flex h-full w-12 shrink-0 items-center justify-center app-muted hover:bg-[var(--app-subtle)]">
          <Search size={18} aria-hidden="true" />
        </button>
      </div>

      {isOpen ? (
        <div
          id="ticker-search-results"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[360px] overflow-y-auto rounded-lg border app-popover shadow-lg"
          role="listbox"
        >
          <div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="px-4 py-3 text-xs app-muted">Searching...</div>
              ) : error ? (
                <div className="px-4 py-3 text-xs text-[var(--app-negative)]">{error}</div>
              ) : (
                <TickerSuggestionGroups
                  groups={suggestionGroups}
                  normalizedQuery={normalizedQuery}
                  onSelect={rememberTicker}
                />
              )}

              {!isLoading && !error && hasTypedQuery && visibleResults.length === 0 ? (
                <TickerRow
                  ticker={tickerShortcut(normalizedQuery, `${normalizedQuery} ticker`, null, null)}
                  meta="Open typed symbol"
                  onSelect={rememberTicker}
                />
              ) : null}
            </div>

          </div>
        </div>
      ) : null}
    </form>
  );
}

function TickerSuggestionGroups({
  groups,
  normalizedQuery,
  onSelect,
}: {
  groups: Array<{ title: string; items: RecentTicker[] }>;
  normalizedQuery: string;
  onSelect: (ticker: RecentTicker) => void;
}) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  if (visibleGroups.length === 0) {
    return normalizedQuery ? null : (
      <div className="px-4 py-3 text-xs app-muted">Start typing a ticker or company name.</div>
    );
  }

  return (
    <>
      {visibleGroups.map((group) => (
        <div key={group.title}>
          <div className="border-b app-border-soft app-subtle px-4 py-2 text-xs font-semibold app-heading">
            {group.title}
          </div>
          {group.items.map((ticker) => (
            <TickerRow
              key={`${group.title}-${ticker.symbol}`}
              ticker={ticker}
              meta={formatTickerMeta(ticker)}
              selected={ticker.symbol === normalizedQuery}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function TickerRow({
  ticker,
  meta,
  selected = false,
  onSelect,
}: {
  ticker: RecentTicker;
  meta: string;
  selected?: boolean;
  onSelect: (ticker: RecentTicker) => void;
}) {
  return (
    <Link
      href={`/stock?symbol=${encodeURIComponent(ticker.symbol)}&autoload=1`}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b app-border-soft px-4 py-2.5 text-left last:border-b-0 hover:bg-[var(--app-surface-muted)]"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(ticker)}
    >
      <TickerLogo ticker={ticker} size="sm" />
      <span className="grid min-w-0 gap-0.5 sm:grid-cols-[120px_1fr] sm:items-center">
        <span className="font-semibold app-heading">{ticker.symbol}</span>
        <span className="truncate text-xs app-heading">{ticker.name ?? `${ticker.symbol} ticker`}</span>
      </span>
      <span className="hidden min-w-[150px] text-right text-xs app-muted sm:block">{meta}</span>
    </Link>
  );
}

function tickerShortcut(
  symbol: string,
  name: string,
  exchange: string | null,
  sector: string | null
): RecentTicker {
  return {
    id: -Math.abs(hashSymbol(symbol)),
    symbol,
    name,
    exchange,
    sector,
    logoUrl: null,
  };
}

function toRecentTicker(ticker: RecentTicker): RecentTicker {
  return {
    id: ticker.id,
    symbol: ticker.symbol,
    name: ticker.name,
    exchange: ticker.exchange,
    sector: ticker.sector,
    logoUrl: ticker.logoUrl,
  };
}

function formatTickerMeta(ticker: RecentTicker) {
  return [ticker.sector, ticker.exchange].filter(Boolean).join(" - ") || "Stock";
}

function readRecentTickers(): RecentTicker[] {
  try {
    const raw = window.localStorage.getItem(recentStorageKey);
    const parsed = raw ? (JSON.parse(raw) as RecentTicker[]) : [];

    return parsed
      .filter((item) => item?.symbol)
      .map((item) => ({
        id: Number(item.id) || -Math.abs(hashSymbol(item.symbol)),
        symbol: item.symbol.toUpperCase(),
        name: item.name ?? `${item.symbol} ticker`,
        exchange: item.exchange ?? null,
        sector: item.sector ?? null,
        logoUrl: item.logoUrl ?? null,
      }))
      .slice(0, 6);
  } catch {
    return [];
  }
}

function writeRecentTickers(items: RecentTicker[]) {
  try {
    window.localStorage.setItem(recentStorageKey, JSON.stringify(items));
  } catch {
    // Recent searches are a convenience only.
  }
}

function hashSymbol(symbol: string) {
  return symbol.split("").reduce((total, char) => total + char.charCodeAt(0), 0) || 1;
}
