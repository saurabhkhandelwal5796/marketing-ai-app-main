"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  newPassword: "",
  confirmPassword: "",
};

export default function MyProfilePage() {
  const router = useRouter();
  const formRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initialForm);
  const [original, setOriginal] = useState(initialForm);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [originalAvatar, setOriginalAvatar] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [touched, setTouched] = useState({});

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load profile.");
      const next = {
        firstName: data?.user?.firstName || "",
        lastName: data?.user?.lastName || "",
        email: data?.user?.email || "",
        company: data?.user?.company || "",
        newPassword: "",
        confirmPassword: "",
      };
      setForm(next);
      setOriginal(next);
      setAvatarPreview(data?.user?.avatar || "");
      setOriginalAvatar(data?.user?.avatar || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [success]);

  const validation = useMemo(() => {
    const next = {};
    const firstName = String(form.firstName || "").trim();
    const lastName = String(form.lastName || "").trim();
    const email = String(form.email || "").trim();
    const company = String(form.company || "").trim();
    const hasPasswordInput = !!form.newPassword || !!form.confirmPassword;

    if (!firstName) next.firstName = "First name is required.";
    if (!lastName) next.lastName = "Last name is required.";
    if (!email) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Please enter a valid email.";
    if (!company) next.company = "Company name is required.";

    if (hasPasswordInput) {
      if (form.newPassword.length < 8) next.newPassword = "Password must be at least 8 characters.";
      if (form.confirmPassword !== form.newPassword) next.confirmPassword = "Passwords do not match.";
    }
    return next;
  }, [form]);

  const isDirty = useMemo(() => {
    return (
      form.firstName !== original.firstName ||
      form.lastName !== original.lastName ||
      form.email !== original.email ||
      form.company !== original.company ||
      avatarPreview !== originalAvatar ||
      !!form.newPassword ||
      !!form.confirmPassword
    );
  }, [form, original, avatarPreview, originalAvatar]);

  const canSubmit = isDirty && !submitting && Object.keys(validation).length === 0;

  const profileName = `${form.firstName} ${form.lastName}`.trim() || "User";
  const avatarInitials = `${(form.firstName || "U").charAt(0)}${(form.lastName || "").charAt(0)}`.toUpperCase();
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const markTouched = (key) => setTouched((prev) => ({ ...prev, [key]: true }));
  const onAvatarFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(String(reader.result || ""));
      setError("");
    };
    reader.onerror = () => setError("Failed to read selected image.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      newPassword: true,
      confirmPassword: true,
    });
    if (Object.keys(validation).length > 0 || !isDirty) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, avatar: avatarPreview }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update profile.");
      setForm((prev) => {
        const next = { ...prev, newPassword: "", confirmPassword: "" };
        setOriginal({ ...next });
        return next;
      });
      setOriginalAvatar(avatarPreview);
      setSuccess("Profile updated successfully.");
      setShowPasswordSection(false);
      setEditingInfo(false);
      setTouched({});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading profile...</div>
      </main>
    );
  }

  return (
    <main className="p-6">
      {success ? (
        <div className="fixed right-6 top-5 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
          {success}
        </div>
      ) : null}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/15 text-xl font-semibold text-white ring-2 ring-white/25">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                avatarInitials || "U"
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{profileName}</h1>
              <p className="text-sm text-slate-200">{form.email || "No email set"}</p>
              <p className="text-xs text-slate-300">{form.company || "No company set"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingInfo(true);
              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Edit Profile
          </button>
        </div>
      </section>

      <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-5">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Personal Info</h2>
            {editingInfo ? (
              <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                Upload Profile Picture
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />
              </label>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              First Name
              <input
                required
                disabled={!editingInfo}
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                onBlur={() => markTouched("firstName")}
                className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium outline-none transition ${
                  touched.firstName && validation.firstName
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                }`}
              />
              {touched.firstName && validation.firstName ? <p className="mt-1 text-xs normal-case text-red-600">{validation.firstName}</p> : null}
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Last Name
              <input
                required
                disabled={!editingInfo}
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                onBlur={() => markTouched("lastName")}
                className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium outline-none transition ${
                  touched.lastName && validation.lastName
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                }`}
              />
              {touched.lastName && validation.lastName ? <p className="mt-1 text-xs normal-case text-red-600">{validation.lastName}</p> : null}
            </label>
          </div>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Email
            <input
              type="email"
              required
              disabled={!editingInfo}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              onBlur={() => markTouched("email")}
              className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium outline-none transition ${
                touched.email && validation.email
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              }`}
            />
            {touched.email && validation.email ? <p className="mt-1 text-xs normal-case text-red-600">{validation.email}</p> : null}
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Company Info</h2>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Company Name
            <input
              required
              disabled={!editingInfo}
              value={form.company}
              onChange={(e) => setField("company", e.target.value)}
              onBlur={() => markTouched("company")}
              className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium outline-none transition ${
                touched.company && validation.company
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              }`}
            />
            {touched.company && validation.company ? <p className="mt-1 text-xs normal-case text-red-600">{validation.company}</p> : null}
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Security</h2>
              <p className="text-sm text-slate-500">Update password only when needed.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordSection((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {showPasswordSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showPasswordSection ? "Hide Password Fields" : "Change Password"}
            </button>
          </div>
          {showPasswordSection ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                New Password
                <input
                  type="password"
                  minLength={8}
                  value={form.newPassword}
                  onChange={(e) => setField("newPassword", e.target.value)}
                  onBlur={() => markTouched("newPassword")}
                  className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium outline-none transition ${
                    touched.newPassword && validation.newPassword
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                {touched.newPassword && validation.newPassword ? (
                  <p className="mt-1 text-xs normal-case text-red-600">{validation.newPassword}</p>
                ) : null}
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Confirm Password
                <input
                  type="password"
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  onBlur={() => markTouched("confirmPassword")}
                  className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium outline-none transition ${
                    touched.confirmPassword && validation.confirmPassword
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                {touched.confirmPassword && validation.confirmPassword ? (
                  <p className="mt-1 text-xs normal-case text-red-600">{validation.confirmPassword}</p>
                ) : null}
              </label>
            </div>
          ) : null}
        </section>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit || (!editingInfo && !showPasswordSection)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <section className="rounded-2xl border border-red-200 bg-red-50/70 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-red-800">Account Actions</h2>
          <p className="mt-1 text-sm text-red-700">Log out from this device session.</p>
          <div>
            <button
              type="button"
              onClick={logout}
              className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
