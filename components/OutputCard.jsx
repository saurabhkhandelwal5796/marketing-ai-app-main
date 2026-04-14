"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function OutputCard({ title, content, onRegenerate, onSend, regenerating }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (_) {
      setCopied(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
          <button
            onClick={onSend}
            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
          >
            Send
          </button>
        </div>
      </div>
      <div className="min-h-40 whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-slate-700">
        {content || "No content yet."}
      </div>
    </motion.article>
  );
}

