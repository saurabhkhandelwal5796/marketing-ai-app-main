"use client";

import { Plus, Trash2 } from "lucide-react";

export default function HeaderActions({ creating, deleting, selectedCount, onCreateNew, onDeleteSelected }) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={deleting || selectedCount === 0}
        onClick={onDeleteSelected}
        className="flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-red-400 hover:shadow-lg hover:border-red-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:-translate-y-0 disabled:hover:bg-white/5 disabled:hover:text-slate-300 disabled:hover:border-white/10 disabled:hover:shadow-none"
      >
        <Trash2 size={16} strokeWidth={2} />
        {deleting ? "Deleting..." : `Delete${selectedCount ? ` (${selectedCount})` : ""}`}
      </button>

      <button
        type="button"
        disabled={creating}
        onClick={onCreateNew}
        className="group relative inline-flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:-translate-y-0 disabled:hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
      >
        <div className="absolute inset-0 rounded-[12px] bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
        <Plus size={18} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
        <span className="relative z-10">{creating ? "Creating..." : "New Campaign"}</span>
      </button>
    </div>
  );
}

