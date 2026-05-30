import type { WealthAdviceItem } from "@/lib/types/wealth";

type Props = {
  advice: WealthAdviceItem[];
};

const priorityStyles: Record<WealthAdviceItem["priority"], string> = {
  high: "border-rose-500/40 bg-rose-500/10",
  medium: "border-amber-500/40 bg-amber-500/10",
  low: "border-emerald-500/40 bg-emerald-500/10",
};

const priorityLabels: Record<WealthAdviceItem["priority"], string> = {
  high: "Priority",
  medium: "Suggested",
  low: "Opportunity",
};

export function WealthAdvicePanel({ advice }: Props) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold app-heading">Personalized guidance</h2>
      <p className="mt-1 text-xs app-muted">
        Rule-based suggestions from your balances, debt mix, and liquidity. Educational only — not
        financial, tax, or legal advice.
      </p>

      {advice.length === 0 ? (
        <p className="mt-4 text-xs app-muted">Add entries to receive tailored suggestions.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {advice.map((item) => (
            <li
              key={item.id}
              className={`rounded-lg border px-3 py-3 ${priorityStyles[item.priority]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold app-heading">{item.title}</p>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide app-muted">
                  {priorityLabels[item.priority]}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 app-muted">{item.summary}</p>
              <p className="mt-2 text-xs font-medium app-heading">
                Next step: {item.action}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
