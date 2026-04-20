"use client";

import { Plus, Trash2 } from "lucide-react";

export default function HeaderActions({ creating, deleting, selectedCount, onCreateNew, onDeleteSelected }) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={deleting || selectedCount === 0}
        onClick={onDeleteSelected}
        className="flex items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:-translate-y-0 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
      >
        <Trash2 size={16} strokeWidth={2} className="text-slate-500 group-hover:text-red-500" />
        {deleting ? "Deleting..." : `Delete${selectedCount ? ` (${selectedCount})` : ""}`}
      </button>

      <button
        type="button"
        disabled={creating}
        onClick={onCreateNew}
        className="group relative inline-flex items-center gap-2 rounded-[12px] bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:-translate-y-0"
      >
        <Plus size={18} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
        <span className="relative z-10">{creating ? "Creating..." : "New Campaign"}</span>
      </button>
    </div>
  );
}

