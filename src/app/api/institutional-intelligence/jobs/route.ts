import { assertCronAccess } from "@/lib/services/cronAuth";
import { runIngestion } from "@/modules/institutional-intelligence/server/ingestion";
import { privateHeaders } from "@/modules/institutional-intelligence/server/auth";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    assertCronAccess(request);
  } catch {
    return Response.json(
      { error: "Job authentication required" },
      { status: 401, headers: privateHeaders },
    );
  }
  if (process.env.INSTITUTIONAL_JOBS_ENABLED !== "true")
    return Response.json(
      { status: "disabled" },
      { status: 503, headers: privateHeaders },
    );
  try {
    return Response.json(await runIngestion(), { headers: privateHeaders });
  } catch {
    return Response.json(
      { error: "Research job failed; see private ingestion log" },
      { status: 503, headers: privateHeaders },
    );
  }
}
