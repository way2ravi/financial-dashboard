import { LockKeyhole, TrendingUp } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return <main className="login-page"><section className="login-card">
    <a className="brand" href="/login"><span className="brand-icon"><TrendingUp size={28} /></span><span>way2investing<span className="brand-sub">SOCIAL STUDIO</span></span></a>
    <span className="login-lock"><LockKeyhole size={25} /></span>
    <div className="eyebrow">PRIVATE WORKSPACE</div>
    <h1>Welcome back.</h1>
    <p>Enter your password to access Social Studio.</p>
    <LoginForm />
    <div className="login-footnote"><LockKeyhole size={13} /> Authorized access only</div>
  </section></main>;
}
