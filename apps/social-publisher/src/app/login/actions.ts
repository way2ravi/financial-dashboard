"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, isPasswordConfigured, passwordMatches, SESSION_COOKIE, SESSION_SECONDS } from "../../lib/password-session";

// Best-effort instance-local throttle for this single shared-password workspace.
// A distributed deployment should enforce a shared limit at its gateway/store too.
const attempts: number[] = [];
const windowMs = 15 * 60 * 1000;

export async function signIn(_previous: { error: string }, form: FormData) {
  if (!isPasswordConfigured()) return { error: "Sign-in is unavailable. Please contact the workspace owner." };
  const cutoff = Date.now() - windowMs;
  while (attempts.length && attempts[0] <= cutoff) attempts.shift();
  if (attempts.length >= 5) return { error: "Too many attempts. Please try again in 15 minutes." };
  // Reserve before the asynchronous delay so parallel requests are also limited.
  attempts.push(Date.now());
  const candidate = form.get("password");
  if (typeof candidate !== "string" || !passwordMatches(candidate)) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    return { error: "Incorrect password. Please try again." };
  }
  (await cookies()).set(SESSION_COOKIE, createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
