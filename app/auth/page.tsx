"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "signup" | "signin";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [signup, setSignup] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
    signupAsAdmin: false,
  });
  const [signin, setSignin] = useState({ email: "", password: "" });

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Sign up failed.");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onSignin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signin),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Sign in failed.");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signup" ? "Start managing your marketing workflows today." : "Sign in to continue to your dashboard."}
            </p>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}

            {mode === "signup" ? (
              <form onSubmit={onSignup} className="mt-5 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    First Name
                    <input
                      required
                      value={signup.firstName}
                      onChange={(e) => setSignup((p) => ({ ...p, firstName: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Last Name
                    <input
                      required
                      value={signup.lastName}
                      onChange={(e) => setSignup((p) => ({ ...p, lastName: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    required
                    value={signup.email}
                    onChange={(e) => setSignup((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Company
                  <input
                    required
                    value={signup.company}
                    onChange={(e) => setSignup((p) => ({ ...p, company: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={signup.password}
                    onChange={(e) => setSignup((p) => ({ ...p, password: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Confirm Password
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={signup.confirmPassword}
                    onChange={(e) => setSignup((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={signup.signupAsAdmin}
                    onChange={(e) => setSignup((p) => ({ ...p, signupAsAdmin: e.target.checked }))}
                  />
                  Sign up as Admin
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Creating account..." : "Sign Up"}
                </button>
              </form>
            ) : (
              <form onSubmit={onSignin} className="mt-5 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    required
                    value={signin.email}
                    onChange={(e) => setSignin((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                  <input
                    type="password"
                    required
                    value={signin.password}
                    onChange={(e) => setSignin((p) => ({ ...p, password: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            <p className="mt-4 text-sm text-slate-600">
              {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="font-semibold text-blue-700 hover:underline"
              >
                {mode === "signup" ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </section>

        <section className="relative hidden min-h-screen lg:block">
          <Image src="/auth-side.png" alt="Authentication side illustration" fill className="object-cover" priority />
        </section>
      </div>
    </main>
  );
}
