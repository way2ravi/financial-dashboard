import {
  requireOwner,
  privateHeaders,
  privateError,
} from "@/modules/institutional-intelligence/server/auth";
import { readResearch } from "@/modules/institutional-intelligence/server/repository";
import { researchView } from "@/modules/institutional-intelligence/server/view";
import { mutateResearch } from "@/modules/institutional-intelligence/server/mutations";
import {
  runIngestion,
  backfillInput,
} from "@/modules/institutional-intelligence/server/ingestion";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const { client, user } = await requireOwner();
    const data = await researchView(
      await readResearch(client, user.id),
      client,
    );
    const exportFile =
      new URL(request.url).searchParams.get("export") === "json";
    return Response.json(data, {
      headers: {
        ...privateHeaders,
        ...(exportFile
          ? {
              "Content-Disposition":
                "attachment; filename=institutional-research.json",
            }
          : {}),
      },
    });
  } catch (error) {
    return privateError(error);
  }
}
export async function POST(request: Request) {
  try {
    const { client, user } = await requireOwner();
    // Cookie-authenticated writes require same-origin requests, including exports/import actions.
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json(
        { error: "Cross-origin write rejected" },
        { status: 403, headers: privateHeaders },
      );
    if (Number(request.headers.get("content-length") ?? 0) > 2_000_000)
      return Response.json(
        { error: "Import too large" },
        { status: 413, headers: privateHeaders },
      );
    const text = await request.text();
    if (text.length > 2_000_000)
      return Response.json(
        { error: "Import too large" },
        { status: 413, headers: privateHeaders },
      );
    const body = JSON.parse(text);
    if (body.action === "ingest")
      return Response.json(await runIngestion(), { headers: privateHeaders });
    if (body.action === "backfill13F")
      return Response.json(await runIngestion(backfillInput(body)), {
        headers: privateHeaders,
      });
    await mutateResearch(body, user.id, client);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return privateError(error);
  }
}
