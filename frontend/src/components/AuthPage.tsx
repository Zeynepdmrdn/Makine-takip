import { useState, type FormEvent } from "react";
import { API_BASE_URL } from "../config/api";
import { saveAuthentication } from "../config/auth";
import type { AuthenticatedUser, AuthenticationError, AuthenticationResult } from "../types/auth";

interface AuthPageProps {
  onAuthenticated: (user: AuthenticatedUser) => void;
}

type AuthenticationMode = "login" | "register";

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthenticationMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchMode = (nextMode: AuthenticationMode): void => {
    setMode(nextMode);
    setErrorMessage(null);
    setPassword("");

    if (nextMode === "login") {
      setName("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    if (mode === "register" && name.trim().length < 2) {
      setErrorMessage("Name must contain at least 2 characters.");

      return;
    }

    if (email.trim() === "") {
      setErrorMessage("Please enter your email address.");

      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must contain at least 8 characters.");

      return;
    }

    try {
      setIsSubmitting(true);

      const endpoint = mode === "login" ? "login" : "register";

      const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(mode === "register"
            ? {
                name: name.trim(),
              }
            : {}),
          email: email.trim(),
          password,
        }),
      });

      const responseData = (await response.json()) as AuthenticationResult | AuthenticationError;

      if (!response.ok) {
        const authenticationError = responseData as AuthenticationError;

        throw new Error(authenticationError.message ?? "Authentication failed.");
      }

      const authenticationResult = responseData as AuthenticationResult;

      saveAuthentication(authenticationResult);

      onAuthenticated(authenticationResult.user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-2">
        <section className="hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">
              Mini MES
            </p>

            <h1 className="mt-5 text-4xl font-bold leading-tight">
              Production monitoring in one place.
            </h1>

            <p className="mt-5 max-w-md text-blue-100">
              Monitor machine statuses, availability, downtime and live sensor readings through a
              secure production dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">Live</p>
              <p className="mt-1 text-sm text-blue-100">Machine monitoring</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">Secure</p>
              <p className="mt-1 text-sm text-blue-100">JWT authentication</p>
            </div>
          </div>
        </section>

        <section className="p-7 sm:p-10 lg:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
              MakineTakip
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to access the machine dashboard."
                : "Register to start monitoring production data."}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
          </div>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-semibold text-slate-700">
                  Full name
                </label>

                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your name"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-700">
                Email address
              </label>

              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {errorMessage && (
              <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Secure authentication powered by hashed passwords and JWT access tokens.
          </p>
        </section>
      </div>
    </main>
  );
}
