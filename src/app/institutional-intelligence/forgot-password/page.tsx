import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { requestResearchPasswordReset } from "./actions";
import styles from "@/modules/institutional-intelligence/ui/terminal.module.css";

export default async function ForgotResearchPassword({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className={styles.login}>
      <div className={styles.loginBrand}>
        <ShieldCheck size={26} />
        <span>WAY2INVESTING / PRIVATE RESEARCH</span>
      </div>
      <h1>Reset your password</h1>
      {query.sent ? (
        <p role="status" className={styles.loginNote}>
          If this is the configured owner account, a password-reset email has
          been requested. Check your inbox and spam folder. Open the newest link
          in the same browser that requested it.
        </p>
      ) : null}
      {query.error ? (
        <p role="alert" className={styles.loginNote}>
          We could not complete the reset request or validate the link. Request
          a new email and open it in the same browser. If sending fails, wait a
          minute and check the Supabase redirect settings.
        </p>
      ) : null}
      <form action={requestResearchPasswordReset} className={styles.loginForm}>
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={320}
          />
        </label>
        <button type="submit" className={styles.primary}>
          <Mail size={16} />
          Send reset email
        </button>
      </form>
      <p className={styles.loginNote}>
        <Link href="/institutional-intelligence/login">Back to sign in</Link>
      </p>
    </main>
  );
}
