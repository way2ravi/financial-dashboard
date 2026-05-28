type Props = {
  fetchedAt?: string | null;
  source?: string | null;
};

export function DataFreshness({ fetchedAt, source }: Props) {
  if (!fetchedAt && !source) {
    return null;
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-md border app-subtle px-2 py-1 text-xs app-muted">
      <span>Source {source || "cache"}</span>
      {fetchedAt ? <span>Updated {formatFreshness(fetchedAt)}</span> : null}
    </div>
  );
}

export function latestFreshness<T extends { fetchedAt: string; source?: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))[0] ?? null;
}

function formatFreshness(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
