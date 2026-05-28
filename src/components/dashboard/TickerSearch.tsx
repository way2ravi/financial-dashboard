type Props = {
  initialSymbol: string;
};

export function TickerSearch({ initialSymbol }: Props) {
  return (
    <form action="/dashboard" className="flex w-full max-w-sm flex-col gap-1">
      <label htmlFor="ticker-symbol" className="text-sm font-medium text-slate-700">
        Ticker
      </label>
      <div className="flex gap-2">
        <input
          id="ticker-symbol"
          name="symbol"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold uppercase text-slate-950 outline-none focus:border-slate-900"
          defaultValue={initialSymbol}
          maxLength={12}
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Load
        </button>
      </div>
    </form>
  );
}

