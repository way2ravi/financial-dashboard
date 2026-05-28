import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export async function AuthStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="h-10 rounded-lg border app-secondary-button px-4 py-2 text-sm font-semibold"
      >
        Sign in
      </Link>
    );
  }

  const email = user.email ?? "Signed in";
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span
        className="flex min-w-0 items-center gap-2 rounded-lg border app-subtle px-2.5 py-1.5"
        title={email}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--app-primary)] text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="max-w-[150px] truncate text-sm app-muted sm:max-w-[220px]">
          {email}
        </span>
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="h-10 rounded-lg border app-secondary-button px-4 text-sm font-semibold"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
