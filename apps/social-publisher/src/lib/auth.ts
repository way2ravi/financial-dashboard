import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, validSession } from "./password-session";

export async function requireSession() {
  if (!validSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/login");
}
