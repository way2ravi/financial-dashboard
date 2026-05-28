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
        className="h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-slate-500">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

