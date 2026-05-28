import { signIn, signUp } from "@/app/auth/actions";
import { PageMessage } from "@/components/dashboard/PageMessage";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";

type Props = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
    notice?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const message = getMessage(await searchParams);

  return (
    <main className="min-h-screen app-bg px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium app-muted">Financial Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal app-heading">
              Sign in to manage your watchlist
            </h1>
          </div>
          <ThemeSwitcher />
        </div>

        {message ? (
          <div className="mb-5">
            <PageMessage message={message} />
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
    <form action={action} className="rounded-lg border app-surface p-5">
      <h2 className="text-lg font-semibold app-heading">{title}</h2>
      <p className="mt-1 text-sm app-muted">{description}</p>

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
        className="mt-5 h-10 w-full rounded-lg app-primary-button px-4 text-sm font-semibold"
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
    <label className="block text-sm font-medium app-muted">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-lg border app-input px-3 text-base outline-none"
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  );
}

function getMessage(searchParams: Awaited<Props["searchParams"]>) {
  const error = getSearchParam(searchParams.error);
  const notice = getSearchParam(searchParams.notice);
  const rawMessage = Array.isArray(searchParams.message)
    ? searchParams.message[0]
    : searchParams.message;

  if (error) {
    return { tone: "error" as const, text: error };
  }

  if (notice) {
    return { tone: "notice" as const, text: notice };
  }

  return rawMessage ? { tone: "notice" as const, text: rawMessage } : null;
}

function getSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
