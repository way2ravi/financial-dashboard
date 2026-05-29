export function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)] text-sm font-semibold text-[var(--app-accent)]">
        W2
      </div>
      <div className="leading-none">
        <div className="text-base font-semibold tracking-normal app-heading">
          way2invest.com
        </div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-normal app-muted">
          Market intelligence
        </div>
      </div>
    </div>
  );
}
