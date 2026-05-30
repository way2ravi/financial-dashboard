import type { CompanyNewsArticle } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";

type Props = {
  news: CompanyNewsArticle[];
  showDataSource?: boolean;
};

export function NewsBlock({ news, showDataSource = false }: Props) {
  const freshness = latestFreshness(news);

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">News</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            Latest company headlines from the cached provider feed.
          </p>
          <div className="mt-2">
            <DataFreshness
              fetchedAt={freshness?.fetchedAt}
              showSource={showDataSource}
              source={freshness?.source}
            />
          </div>
        </div>
      </div>

      {news.length === 0 ? (
        <div className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
          No company news is cached yet. Press Load to refresh Finnhub first, then Alpha Vantage as fallback. Some smaller tickers may not return provider news on free plans.
        </div>
      ) : (
        <div className="mt-3 divide-y app-border-soft">
          {news.slice(0, 6).map((article) => (
            <article key={article.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <a
                    className="text-sm font-semibold app-heading hover:underline"
                    href={article.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {article.headline}
                  </a>
                  {article.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 app-muted">{article.summary}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs app-muted">
                    <span>
                      {article.sourceName ?? (showDataSource ? article.source : null) ?? "News"}
                    </span>
                    <span>{formatNewsDate(article.publishedAt)}</span>
                  </div>
                </div>
                <SentimentBadge article={article} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SentimentBadge({ article }: { article: CompanyNewsArticle }) {
  if (!article.sentimentLabel && article.sentimentScore === null) {
    return null;
  }

  const label = article.sentimentLabel ?? "Sentiment";
  const score = article.sentimentScore;
  const tone =
    score !== null && score > 0.15
      ? "bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] app-positive"
      : score !== null && score < -0.15
        ? "bg-[color-mix(in_srgb,var(--app-negative)_12%,transparent)] app-negative"
        : "app-subtle";

  return (
    <span className={`inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function formatNewsDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
