import { signIn, signUp } from "@/app/auth/actions";

type Props = {
  searchParams: Promise<{
    message?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const message = getMessage(await searchParams);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Financial Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Sign in to manage your watchlist
          </h1>
        </div>

        {message ? (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <AuthForm
            title="Sign In"
            description="Use your Supabase email and password account."
            action={signIn}
            submitLabel="Sign in"
          />
          <AuthForm
            title="Create Account"
            description="Create a new account for watchlists and saved preferences."
            action={signUp}
            submitLabel="Create account"
            showDisplayName
          />
        </div>
      </div>
    </main>
  );
}

function AuthForm({
  title,
  description,
  action,
  submitLabel,
  showDisplayName = false,
}: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  showDisplayName?: boolean;
}) {
  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 space-y-4">
        {showDisplayName ? (
          <Field
            label="Display name"
            name="display_name"
            type="text"
            autoComplete="name"
            required={false}
          />
        ) : null}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={showDisplayName ? "new-password" : "current-password"}
        />
      </div>

      <button
        type="submit"
        className="mt-5 h-10 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-slate-900"
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  );
}

function getMessage(searchParams: Awaited<Props["searchParams"]>) {
  const rawMessage = Array.isArray(searchParams.message)
    ? searchParams.message[0]
    : searchParams.message;

  return rawMessage ?? "";
}
