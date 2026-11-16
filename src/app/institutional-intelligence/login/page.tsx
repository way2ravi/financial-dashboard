import { ShieldCheck, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { researchSignIn } from "./actions";
import styles from "@/modules/institutional-intelligence/ui/terminal.module.css";
export default async function ResearchLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className={styles.login}>
      <div className={styles.loginBrand}>
        <ShieldCheck size={26} />
        <span>WAY2INVESTING / PRIVATE RESEARCH</span>
      </div>
      <h1>Institutional Intelligence</h1>
      <p className={styles.muted}>Owner access</p>
      {query.notice === "password-updated" ||
      query.notice === "password-updated-sessions" ? (
        <p role="status" className={styles.loginNote}>
          Your password was updated. Sign in with your new password.
          {query.notice === "password-updated-sessions"
            ? " Other sessions could not be revoked; review them in Supabase."
            : ""}
        </p>
      ) : null}
      <form action={researchSignIn} className={styles.loginForm}>
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            maxLength={320}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={2048}
          />
        </label>
        {query.error ? (
          <p role="alert" className={styles.negative}>
            Unable to authorise this account. Check your credentials, verified
            email and owner configuration.
          </p>
        ) : null}
        <button type="submit" className={styles.primary}>
          <LockKeyhole size={16} />
          Sign in
        </button>
      </form>
      <p className={styles.loginNote}>
        <Link href="/institutional-intelligence/forgot-password">
          Forgot password?
        </Link>
      </p>
      <p className={styles.loginNote}>
        Restricted research workspace. No public account registration.
      </p>
    </main>
  );
}
