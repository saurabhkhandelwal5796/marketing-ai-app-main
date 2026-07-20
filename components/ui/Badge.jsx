"use client";

export default function Badge({ variant = "default", className = "", children }) {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    confirmed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    cancelled: "bg-red-50 text-red-700 ring-1 ring-red-100",
    ai: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    manual: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    sales: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${styles[variant] || styles.default} ${className}`}
    >
      {children}
    </span>
  );
}

