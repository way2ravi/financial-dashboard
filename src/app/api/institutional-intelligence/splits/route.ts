import {
  requireOwner,
  privateHeaders,
  privateError,
  ResearchInputError,
} from "@/modules/institutional-intelligence/server/auth";
import {
  checkMassiveSplits,
  splitCheckInput,
} from "@/modules/institutional-intelligence/server/massive";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
let nextRequestAt = 0;

export async function POST(request: Request) {
  try {
    await requireOwner();
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json(
        { error: "Cross-origin request rejected" },
        { status: 403, headers: privateHeaders },
      );
    if (Number(request.headers.get("content-length") ?? 0) > 4096)
      throw new ResearchInputError("Request too large");
    const text = await request.text();
    if (text.length > 4096) throw new ResearchInputError("Request too large");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new ResearchInputError("Invalid request");
    }
    const input = splitCheckInput(body);
    if (Date.now() < nextRequestAt)
      return Response.json(
        { error: "Wait 15 seconds between split checks" },
        {
          status: 429,
          headers: { ...privateHeaders, "Retry-After": "15" },
        },
      );
    nextRequestAt = Date.now() + 15000;
    return Response.json(await checkMassiveSplits(input), {
      headers: privateHeaders,
    });
  } catch (error) {
    return privateError(error);
  }
}
