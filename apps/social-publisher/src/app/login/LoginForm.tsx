"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return <form action={action} className="login-form">
    <label htmlFor="password">Password</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} autoFocus aria-describedby={state.error ? "login-error" : undefined} aria-invalid={!!state.error} placeholder="Enter your password" />
    {state.error && <p id="login-error" role="alert" className="login-error">{state.error}</p>}
    <button type="submit" className="primary" disabled={pending}>{pending ? "Signing in…" : "Unlock workspace"}<ArrowRight size={16} /></button>
  </form>;
}
