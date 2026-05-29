import { isAppError } from "@/lib/services";

export function jsonError(error: unknown) {
  if (isAppError(error)) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const message = getErrorMessage(error);

  return Response.json({ error: message }, { status: 500 });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unexpected server error";
}
