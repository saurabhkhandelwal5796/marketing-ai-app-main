"use client";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center px-6 py-10">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <p className="text-sm font-medium text-slate-700">Loading...</p>
      </div>
    </div>
  );
}

