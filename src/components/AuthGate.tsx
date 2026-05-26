import { FormEvent, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";

interface AuthGateProps {
  onGoogle: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<void>;
}

export const AuthGate = ({
  onGoogle,
  onEmailSignIn,
  onEmailSignUp
}: AuthGateProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        await onEmailSignIn(email, password);
      } else {
        await onEmailSignUp(email, password);
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      await onGoogle();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Google sign-in failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh bg-ash px-5 py-7 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-sm flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Kurukkan Undo?
              </h1>
              <p className="mt-1 text-sm font-medium text-moss">Sookshikkuka.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-2xl">
              🦊
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-panel backdrop-blur">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-moss/[0.14] text-moss">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Live campus awareness</h2>
                <p className="text-sm text-white/55">Sign in to report and vote.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-ash transition hover:bg-white/90 disabled:opacity-60"
            >
              <span className="text-lg">G</span>
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-white/35">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submitEmail} className="space-y-3">
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-white/35 focus:border-moss/60"
                />
              </label>
              <label className="block">
                <span className="sr-only">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition placeholder:text-white/35 focus:border-moss/60"
                />
              </label>
              {error && (
                <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-moss font-semibold text-ash transition hover:bg-moss/90 disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full text-center text-sm font-medium text-white/60"
            >
              {mode === "signin"
                ? "Need an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="pt-8 text-center text-xs leading-5 text-white/35">
          Reports expire automatically. Vote once per report.
        </p>
      </div>
    </main>
  );
};
