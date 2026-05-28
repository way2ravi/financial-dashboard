import { isAppError } from "@/lib/services";

export function jsonError(error: unknown) {
  if (isAppError(error)) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";

  return Response.json({ error: message }, { status: 500 });
}

