import { AppError } from "./errors";

export function assertCronAccess(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    throw new AppError("CRON_SECRET is not configured", 500);
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (
    authorization !== `Bearer ${configuredSecret}` &&
    headerSecret !== configuredSecret
  ) {
    throw new AppError("Cron access is required", 401);
  }
}
