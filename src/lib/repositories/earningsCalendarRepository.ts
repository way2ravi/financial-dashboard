import type { SupabaseClient } from "@supabase/supabase-js";
import { mapEarningsCalendarItem } from "@/lib/repositories/mappers";
import type { Database } from "@/lib/types/database";
import type {
  EarningsCalendarItem,
  ProviderEarningsCalendarItem,
} from "@/lib/types/market";

type DbClient = SupabaseClient<Database>;

export async function getEarningsCalendarByDate(
  supabase: DbClient,
  date: string
): Promise<EarningsCalendarItem[]> {
  const { data, error } = await supabase
    .from("earnings_calendar")
    .select("*")
    .eq("report_date", date)
    .order("hour", { ascending: true })
    .order("symbol", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapEarningsCalendarItem);
}

export async function upsertEarningsCalendar(
  supabase: DbClient,
  rows: ProviderEarningsCalendarItem[]
): Promise<void> {
  const uniqueRows = dedupeEarningsCalendarRows(rows);

  if (uniqueRows.length === 0) {
    return;
  }

  const fetchedAt = new Date().toISOString();
  const { error } = await supabase.from("earnings_calendar").upsert(
    uniqueRows.map((row) => ({
      symbol: row.symbol,
      report_date: row.reportDate,
      hour: row.hour,
      fiscal_year: row.fiscalYear,
      fiscal_quarter: row.fiscalQuarter,
      eps_actual: row.epsActual,
      eps_estimate: row.epsEstimate,
      revenue_actual: row.revenueActual,
      revenue_estimate: row.revenueEstimate,
      source: row.source,
      source_updated_at: row.sourceUpdatedAt,
      fetched_at: fetchedAt,
    })),
    { onConflict: "symbol,report_date" }
  );

  if (error) {
    throw error;
  }
}

function dedupeEarningsCalendarRows(rows: ProviderEarningsCalendarItem[]) {
  const bySymbolDate = new Map<string, ProviderEarningsCalendarItem>();

  rows.forEach((row) => {
    bySymbolDate.set(`${row.symbol}:${row.reportDate}`, row);
  });

  return [...bySymbolDate.values()];
}
