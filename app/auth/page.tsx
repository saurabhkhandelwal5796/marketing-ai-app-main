"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAuditSessionAtLogin, trackEvent } from "../../lib/auditTracker";

type AuthMode = "signup" | "signin";
type SignupField = "firstName" | "lastName" | "email" | "company" | "password" | "confirmPassword";

const NAME_REGEX = /^[A-Za-z]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

function getSignupErrors(signup: {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  password: string;
  confirmPassword: string;
}) {
  const errors: Partial<Record<SignupField, string>> = {};

  const firstName = signup.firstName.trim();
  if (!firstName) errors.firstName = "First name is required.";
  else if (firstName.length > 15) errors.firstName = "First name must be at most 15 characters.";
  else if (!NAME_REGEX.test(firstName)) errors.firstName = "First name must contain only alphabets.";

  const lastName = signup.lastName.trim();
  if (!lastName) errors.lastName = "Last name is required.";
  else if (lastName.length > 15) errors.lastName = "Last name must be at most 15 characters.";
  else if (!NAME_REGEX.test(lastName)) errors.lastName = "Last name must contain only alphabets.";

  const email = signup.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Please enter a valid email address.";

  const company = signup.company.trim();
  if (!company) errors.company = "Company name is required.";
  else if (company.length > 30) errors.company = "Company name must be at most 30 characters.";

  if (!signup.password) errors.password = "Password is required.";
  else if (signup.password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (!PASSWORD_REGEX.test(signup.password)) {
    errors.password =
      "Password must include uppercase, lowercase, number, and special character.";
  }

  if (!signup.confirmPassword) errors.confirmPassword = "Confirm password is required.";
  else if (signup.confirmPassword !== signup.password) errors.confirmPassword = "Passwords do not match.";

  return errors;
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [signup, setSignup] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Record<SignupField, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    company: false,
    password: false,
    confirmPassword: false,
  });
  const signupErrors = getSignupErrors(signup);
  const isSignupValid = Object.keys(signupErrors).length === 0;

  const markTouched = (field: SignupField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const fieldError = (field: SignupField) => (touched[field] ? signupErrors[field] : "");

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      password: true,
      confirmPassword: true,
    });
    if (!isSignupValid) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Sign up failed.");
      setSuccessMessage("Account created successfully. Please sign in to continue.");
      setMode("signin");
      setSignup({
        firstName: "",
        lastName: "",
        email: "",
        company: "",
        password: "",
        confirmPassword: "",
      });
      setTouched({
        firstName: false,
        lastName: false,
        email: false,
        company: false,
        password: false,
        confirmPassword: false,
      });
      setSignin((prev) => ({ ...prev, email: signup.email.trim() }));
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
    setSuccessMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signin),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Sign in failed.");
      ensureAuditSessionAtLogin();
      if (data?.user?.id) {
        trackEvent(String(data.user.id), "login", { page_name: "Auth" });
      }
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
    <main className="min-h-dvh bg-slate-100">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
        <section className="flex items-start justify-center p-6 pt-8 lg:p-12 lg:pt-12">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signup" ? "Start managing your marketing workflows today." : "Sign in to continue to your dashboard."}
            </p>

            {successMessage ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}
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
                      maxLength={15}
                      value={signup.firstName}
                      onChange={(e) => setSignup((p) => ({ ...p, firstName: e.target.value }))}
                      onBlur={() => markTouched("firstName")}
                      className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                        fieldError("firstName")
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                    {fieldError("firstName") ? <p className="mt-1 text-xs text-red-600">{fieldError("firstName")}</p> : null}
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Last Name
                    <input
                      required
                      maxLength={15}
                      value={signup.lastName}
                      onChange={(e) => setSignup((p) => ({ ...p, lastName: e.target.value }))}
                      onBlur={() => markTouched("lastName")}
                      className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                        fieldError("lastName")
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                    {fieldError("lastName") ? <p className="mt-1 text-xs text-red-600">{fieldError("lastName")}</p> : null}
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    required
                    value={signup.email}
                    onChange={(e) => setSignup((p) => ({ ...p, email: e.target.value }))}
                    onBlur={() => markTouched("email")}
                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                      fieldError("email")
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {fieldError("email") ? <p className="mt-1 text-xs text-red-600">{fieldError("email")}</p> : null}
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Company Name
                  <input
                    required
                    maxLength={30}
                    value={signup.company}
                    onChange={(e) => setSignup((p) => ({ ...p, company: e.target.value }))}
                    onBlur={() => markTouched("company")}
                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                      fieldError("company")
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {fieldError("company") ? <p className="mt-1 text-xs text-red-600">{fieldError("company")}</p> : null}
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={signup.password}
                    onChange={(e) => setSignup((p) => ({ ...p, password: e.target.value }))}
                    onBlur={() => markTouched("password")}
                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                      fieldError("password")
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {fieldError("password") ? <p className="mt-1 text-xs text-red-600">{fieldError("password")}</p> : null}
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Confirm Password
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={signup.confirmPassword}
                    onChange={(e) => setSignup((p) => ({ ...p, confirmPassword: e.target.value }))}
                    onBlur={() => markTouched("confirmPassword")}
                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                      fieldError("confirmPassword")
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {fieldError("confirmPassword") ? (
                    <p className="mt-1 text-xs text-red-600">{fieldError("confirmPassword")}</p>
                  ) : null}
                </label>
                {isSignupValid ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    All fields look good. You can create your account.
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting || !isSignupValid}
                  className="mt-2 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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

        <section className="relative hidden min-h-dvh lg:block">
          <Image
            src="/auth-side.png"
            alt="Authentication side illustration"
            fill
            sizes="50vw"
            className="object-cover"
            priority
          />
        </section>
      </div>
    </main>
  );
}
