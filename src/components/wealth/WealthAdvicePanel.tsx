import type { WealthAdviceItem } from "@/lib/types/wealth";

type Props = {
  advice: WealthAdviceItem[];
};

const priorityStyles: Record<WealthAdviceItem["priority"], string> = {
  high: "border-rose-500/45 bg-rose-500/10 text-rose-300",
  medium: "border-amber-500/45 bg-amber-500/10 text-amber-300",
  low: "border-emerald-500/45 bg-emerald-500/10 text-emerald-300",
};

const priorityLabels: Record<WealthAdviceItem["priority"], string> = {
  high: "Priority",
  medium: "Suggested",
  low: "Opportunity",
};

const moduleLabels: Record<WealthAdviceItem["module"], string> = {
  overview: "Overview",
  liquidity: "Liquidity",
  debt: "Debt",
  assets: "Assets",
  investments: "Investments",
  risk: "Risk",
  planning: "Planning",
};

const moduleOrder: WealthAdviceItem["module"][] = [
  "overview",
  "liquidity",
  "debt",
  "risk",
  "assets",
  "investments",
  "planning",
];

export function WealthAdvicePanel({ advice }: Props) {
  const groupedAdvice = moduleOrder
    .map((module) => ({
      module,
      items: advice.filter((item) => item.module === module),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Personalized guidance</h2>
          <p className="mt-1 text-xs app-muted">
            Module-by-module suggestions from your balances, debt mix, and liquidity. Educational
            only, not financial, tax, or legal advice.
          </p>
        </div>
        <span className="w-fit rounded-full border app-border-soft px-2.5 py-1 text-[11px] font-semibold app-muted">
          {advice.length} insight{advice.length === 1 ? "" : "s"}
        </span>
      </div>

      {advice.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed app-subtle p-4 text-xs app-muted">
          Add entries to receive tailored suggestions across liquidity, debt, investments, and
          planning.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {groupedAdvice.map((group) => (
            <div key={group.module} className="rounded-lg border app-subtle p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide app-muted">
                  {moduleLabels[group.module]}
                </h3>
                <span className="text-[11px] app-muted">
                  {group.items.length} item{group.items.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="mt-3 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.id} className="rounded-lg border app-surface px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold app-heading">{item.title}</p>
                        {item.metric ? (
                          <p className="mt-0.5 text-[11px] font-semibold app-muted">
                            {item.metric}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityStyles[item.priority]}`}
                      >
                        {priorityLabels[item.priority]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 app-muted">{item.summary}</p>
                    <div className="mt-3 rounded-md app-subtle px-3 py-2 text-xs font-medium app-heading">
                      Next: {item.action}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
