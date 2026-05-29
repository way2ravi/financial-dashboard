import { jsonError } from "@/app/api/_shared/jsonError";
import {
  getDailyEarningsCalendar,
  refreshDailyEarningsCalendar,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayDate();
    const refresh = url.searchParams.get("refresh") === "1";
    const result = refresh
      ? await refreshDailyEarningsCalendar(createAdminClient(), date)
      : await getDailyEarningsCalendar(await createClient(), date);

    return Response.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { date?: string };
    const result = await refreshDailyEarningsCalendar(
      createAdminClient(),
      body.date ?? todayDate()
    );

    return Response.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
