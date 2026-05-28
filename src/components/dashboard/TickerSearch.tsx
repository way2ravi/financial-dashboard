type Props = {
  initialSymbol: string;
};

export function TickerSearch({ initialSymbol }: Props) {
  return (
    <form action="/dashboard" className="flex w-full max-w-sm flex-col gap-1">
      <label htmlFor="ticker-symbol" className="text-sm font-medium app-muted">
        Ticker
      </label>
      <div className="flex gap-2">
        <input
          id="ticker-symbol"
          name="symbol"
          className="h-10 min-w-0 flex-1 rounded-lg border app-input px-3 text-base font-semibold uppercase outline-none"
          defaultValue={initialSymbol}
          maxLength={12}
        />
        <button
          type="submit"
          className="h-10 rounded-lg app-primary-button px-4 text-sm font-semibold"
        >
          Load
        </button>
      </div>
    </form>
  );
}
