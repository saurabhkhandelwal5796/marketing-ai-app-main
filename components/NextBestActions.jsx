"use client";

import { motion } from "framer-motion";

export default function NextBestActions({
  actions,
  selectedActions,
  onToggle,
  onGenerate,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Next Best Actions</h3>
      <p className="mt-1 text-sm text-slate-500">Select one or more channels to generate content.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => {
          const active = selectedActions.includes(action);
          return (
            <motion.button
              key={action}
              whileTap={{ scale: 0.97 }}
              onClick={() => onToggle(action)}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {action}
            </motion.button>
          );
        })}
        {actions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Select at least one marketing plan step to see channel actions.
          </div>
        ) : null}
      </div>

      <button
        onClick={onGenerate}
        disabled={loading || selectedActions.length === 0}
        className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Generating..." : "Generate Content"}
      </button>
    </div>
  );
}

