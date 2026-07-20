"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// import { useRouter, useSearchParams } from "next/navigation";
import { 
  Building2, 
  Camera, 
  CheckCircle2, 
  Key, 
  LogOut, 
  Mail, 
  MapPin, 
  PencilLine, 
  ShieldCheck, 
  Smartphone, 
  Trash2, 
  Upload, 
  UserCircle2 
} from "lucide-react";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

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
  const firstNameInputRef = useRef(null);
  const avatarMenuRef = useRef(null);
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
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!avatarMenuRef.current?.contains(event.target)) setShowAvatarMenu(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
      else if (!PASSWORD_REGEX.test(form.newPassword)) {
        next.newPassword = "Password must include uppercase, lowercase, number, and special character.";
      }
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

  const removeAvatar = () => {
    setAvatarPreview("");
    setError("");
  };

  const startEditingProfile = () => {
    setEditingInfo(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => firstNameInputRef.current?.focus(), 150);
  };

  const cancelEditingProfile = () => {
    setForm((prev) => ({
      ...prev,
      firstName: original.firstName,
      lastName: original.lastName,
      email: original.email,
      company: original.company,
      newPassword: "",
      confirmPassword: "",
    }));
    setAvatarPreview(originalAvatar);
    setEditingInfo(false);
    setShowPasswordSection(false);
    setShowAvatarMenu(false);
    setTouched({});
    setError("");
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
      <main className="min-h-full bg-[#F8FAFC] p-6 lg:p-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading profile...
        </div>
      </main>
    );
  }

  const isValidAvatar = avatarPreview && (avatarPreview.startsWith("data:image/") || avatarPreview.startsWith("http://") || avatarPreview.startsWith("https://"));

  return (
    <main className="min-h-full bg-[#F8FAFC] p-6 lg:p-8">
      {success ? (
        <div className="fixed right-6 top-5 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
          {success}
        </div>
      ) : null}

      <form ref={formRef} onSubmit={onSubmit} className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        
        {/* TOP SECTION: Profile Header Card */}
        <section className="relative rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 transition-all duration-300">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            
            {/* LEFT & CENTER: Avatar and Info */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              
              {/* LEFT: Avatar with edit overlay */}
              <div 
                ref={avatarMenuRef}
                className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24"
              >
                <div className="h-full w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm group relative">
                  {isValidAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="Profile avatar" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-3xl font-bold text-indigo-600">
                      {avatarInitials || "U"}
                    </div>
                  )}
                </div>

                {editingInfo && (
                  <button 
                    type="button"
                    onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-indigo-600 transition-transform hover:scale-105 z-20"
                  >
                    <Camera size={14} />
                  </button>
                )}

                {editingInfo && showAvatarMenu && (
                  <div className="absolute top-full left-0 mt-3 w-48 rounded-xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 py-1.5 z-[60] flex flex-col">
                    <label className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                      <Upload size={14} className="text-slate-400" /> {isValidAvatar ? "Change Picture" : "Upload Picture"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { onAvatarFile(e); setShowAvatarMenu(false); }} />
                    </label>
                    {isValidAvatar && (
                      <button 
                        type="button" 
                        onClick={() => { removeAvatar(); setShowAvatarMenu(false); }}
                        className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 text-left flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-500" /> Remove Picture
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* CENTER: Info */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-slate-900">{profileName}</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">{form.company || "Premium Enterprise Account"}</p>
                
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> {form.email || "No email set"}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> Global Remote</span>
                </div>
              </div>
            </div>

            {/* RIGHT: Action Buttons */}
            <div className="flex shrink-0 gap-3">
               {!editingInfo ? (
                 <button
                   type="button"
                   onClick={startEditingProfile}
                   className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[0.98] hover:bg-slate-800"
                 >
                   <PencilLine size={16} />
                   Edit Profile
                 </button>
               ) : (
                 <>
                   <button
                     type="button"
                     onClick={cancelEditingProfile}
                     className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     disabled={!canSubmit}
                     className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[0.98] hover:bg-blue-700 disabled:opacity-50"
                   >
                     {submitting ? "Saving..." : "Save Changes"}
                   </button>
                 </>
               )}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {/* MAIN CONTENT GRID */}
        <div className="flex flex-col gap-6 lg:flex-row">
          
          {/* LEFT SIDE (65%) */}
          <div className="flex w-full flex-col gap-6 lg:w-[65%]">
            
            {/* 1. Personal Information Card */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 bg-blue-500"></div>
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <UserCircle2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
                  <p className="text-xs text-slate-500">Update your name and contact details.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">First Name</span>
                  <input
                    ref={firstNameInputRef}
                    required
                    disabled={!editingInfo}
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    onBlur={() => markTouched("firstName")}
                    className={`w-full rounded-lg border-transparent bg-slate-100 px-4 py-3 text-sm font-medium outline-none transition-all ${
                      touched.firstName && validation.firstName
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
                        : "focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                    }`}
                  />
                  {touched.firstName && validation.firstName ? <p className="mt-1 text-xs text-red-600">{validation.firstName}</p> : null}
                </label>
                
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">Last Name</span>
                  <input
                    required
                    disabled={!editingInfo}
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    onBlur={() => markTouched("lastName")}
                    className={`w-full rounded-lg border-transparent bg-slate-100 px-4 py-3 text-sm font-medium outline-none transition-all ${
                      touched.lastName && validation.lastName
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
                        : "focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                    }`}
                  />
                  {touched.lastName && validation.lastName ? <p className="mt-1 text-xs text-red-600">{validation.lastName}</p> : null}
                </label>
                
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">Email Address</span>
                  <input
                    type="email"
                    required
                    disabled={!editingInfo}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    onBlur={() => markTouched("email")}
                    className={`w-full rounded-lg border-transparent bg-slate-100 px-4 py-3 text-sm font-medium outline-none transition-all ${
                      touched.email && validation.email
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
                        : "focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                    }`}
                  />
                  {touched.email && validation.email ? <p className="mt-1 text-xs text-red-600">{validation.email}</p> : null}
                </label>
              </div>
            </section>

            {/* 2. Company Information Card */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500"></div>
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Organization</h2>
                  <p className="text-xs text-slate-500">Your workspace and team details.</p>
                </div>
              </div>

              {!editingInfo ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                      <span className="text-lg font-bold text-slate-800">
                        {form.company ? form.company.charAt(0).toUpperCase() : "C"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{form.company || "No company set"}</p>
                      <p className="text-xs font-medium text-slate-500">Premium Enterprise Account</p>
                    </div>
                  </div>
                  <button type="button" className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50">
                    Manage Org
                  </button>
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-500">Company Name</span>
                  <input
                    required
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                    onBlur={() => markTouched("company")}
                    className={`w-full rounded-lg border-transparent bg-slate-100 px-4 py-3 text-sm font-medium outline-none transition-all ${
                      touched.company && validation.company
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
                        : "focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    }`}
                  />
                  {touched.company && validation.company ? <p className="mt-1 text-xs text-red-600">{validation.company}</p> : null}
                </label>
              )}
            </section>
          </div>

          {/* RIGHT SIDE (35%) */}
          <div className="flex w-full flex-col gap-6 lg:w-[35%]">
            
            {/* 3. Security Card */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md">
              <div className="absolute left-0 top-0 h-full w-1 bg-red-500"></div>
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Security</h2>
                  <p className="text-xs text-slate-500">Keep your account safe.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key size={16} className="text-slate-400" />
                      <p className="text-sm font-semibold text-slate-800">Password</p>
                    </div>
                    {editingInfo && (
                      <button
                        type="button"
                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {showPasswordSection ? "Cancel" : "Change"}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 pl-6">Last changed 3 months ago</p>

                  {editingInfo && showPasswordSection && (
                    <div className="mt-4 space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">New Password</span>
                        <input
                          type="password"
                          minLength={8}
                          value={form.newPassword}
                          onChange={(e) => setField("newPassword", e.target.value)}
                          onBlur={() => markTouched("newPassword")}
                          className={`w-full rounded-md border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all ${
                            touched.newPassword && validation.newPassword
                              ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200"
                              : "focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                          }`}
                        />
                        {touched.newPassword && validation.newPassword ? (
                          <p className="mt-1 text-[10px] text-red-600">{validation.newPassword}</p>
                        ) : null}
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Confirm Password</span>
                        <input
                          type="password"
                          minLength={8}
                          value={form.confirmPassword}
                          onChange={(e) => setField("confirmPassword", e.target.value)}
                          onBlur={() => markTouched("confirmPassword")}
                          className={`w-full rounded-md border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all ${
                            touched.confirmPassword && validation.confirmPassword
                              ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200"
                              : "focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                          }`}
                        />
                        {touched.confirmPassword && validation.confirmPassword ? (
                          <p className="mt-1 text-[10px] text-red-600">{validation.confirmPassword}</p>
                        ) : null}
                      </label>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-slate-400" />
                      <p className="text-sm font-semibold text-slate-800">Two-Factor Auth</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 pl-6">Authenticator app configured</p>
                </div>
              </div>
            </section>

            {/* 4. Session Control & Logout Card */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Session Controls</h2>
              
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Log out of all devices
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </section>

          </div>
        </div>
      </form>
    </main>
  );
}
