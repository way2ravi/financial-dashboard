import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, LockKeyhole } from "lucide-react";
import { requireOwner } from "@/modules/institutional-intelligence/server/auth";
import { updateResearchPassword } from "./actions";
import styles from "@/modules/institutional-intelligence/ui/terminal.module.css";

export default async function ResetResearchPassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const owner = await requireOwner().catch(() => null);
  if (!owner)
    redirect("/institutional-intelligence/forgot-password?error=session");
  const query = await searchParams;
  return (
    <main className={styles.login}>
      <div className={styles.loginBrand}>
        <ShieldCheck size={26} />
        <span>WAY2INVESTING / PRIVATE RESEARCH</span>
      </div>
      <h1>Choose a new password</h1>
      {query.error ? (
        <p role="alert" className={styles.loginNote}>
          {query.error === "validation"
            ? "Use at least 12 characters and enter the same password in both fields."
            : "The password could not be updated. Choose a different strong password or request a fresh recovery link."}
        </p>
      ) : null}
      <form action={updateResearchPassword} className={styles.loginForm}>
        <label>
          New password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={1024}
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            name="confirmation"
            autoComplete="new-password"
            minLength={12}
            maxLength={1024}
            required
          />
        </label>
        <button type="submit" className={styles.primary}>
          <LockKeyhole size={16} />
          Update password
        </button>
      </form>
      <p className={styles.loginNote}>
        <Link href="/institutional-intelligence/forgot-password">
          Request another reset email
        </Link>
      </p>
    </main>
  );
}
