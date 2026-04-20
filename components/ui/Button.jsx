"use client";

export default function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 cursor-pointer";

  const styles = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:bg-blue-700 disabled:opacity-60",
    secondary: "border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-60",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-60",
  };

  return (
    <button type={type} className={`${base} ${styles[variant] || styles.primary} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

