import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pageMetadata } from "@/lib/seo";
import { data, getPage, t } from "@/lib/site-data";

export const Route = createFileRoute("/login")({
  head: () => pageMetadata("login"),
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const portalPath = getPage("portal").path;
  const loginPage = getPage("login");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && user) {
    return <Navigate to={portalPath} />;
  }

  async function handleEmailAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split("@")[0] || "Faculty",
        });
        if (res.error) {
          setError(res.error.message ?? "Could not create account.");
        } else {
          await navigate({ to: portalPath });
        }
      } else {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) {
          setError(res.error.message ?? "Invalid email or password.");
        } else {
          await navigate({ to: portalPath });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteShell>
      <main className="mx-auto max-w-md px-5 py-14 sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium tracking-wide text-accent uppercase">
                {data.org.shortName} · {data.org.parent.shortName}
              </p>
              <h1 className="font-display text-2xl font-semibold">
                {t(loginPage.title)}
              </h1>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted">
            Sign in to view and post updates on {data.org.shortName} research projects,
            milestones, and domain pilots.
          </p>

          {authEnabled ? (
            <>
              <div className="mt-6 space-y-2.5">
                {GROK_PROVIDERS.map((p) => (
                  <button
                    key={p.providerId}
                    type="button"
                    onClick={() => signIn(p.providerId, { callbackURL: portalPath })}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
                  >
                    Continue with {p.label}
                  </button>
                ))}
              </div>

              <div className="my-6 flex items-center gap-3 text-xs text-muted">
                <div className="h-px flex-1 bg-border" />
                <span>or with faculty email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="mb-4 grid grid-cols-2 rounded-lg bg-soft p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className={`min-h-9 rounded-md py-1.5 transition-colors ${
                    mode === "signin" ? "bg-surface text-fg shadow-xs" : "text-muted"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className={`min-h-9 rounded-md py-1.5 transition-colors ${
                    mode === "signup" ? "bg-surface text-fg shadow-xs" : "text-muted"
                  }`}
                >
                  Register Account
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === "signup" && (
                  <label className="block">
                    <span className="text-xs font-medium text-fg">Full Name</span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Faculty or Researcher Name"
                      className="mt-1 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-primary"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="text-xs font-medium text-fg">Institutional Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@iiit.ac.in"
                    className="mt-1 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-fg">Password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="mt-1 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none focus:border-primary"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {mode === "signup" ? (
                    <>
                      <KeyRound className="size-4" />
                      {busy ? "Creating account…" : "Create Faculty Account"}
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      {busy ? "Signing in…" : "Sign in to Portal"}
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-in is currently disabled.</p>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
