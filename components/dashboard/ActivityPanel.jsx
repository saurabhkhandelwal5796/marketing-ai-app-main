"use client";

import { Clock3, Eye, FilePlus2, Send } from "lucide-react";

const eventIcon = (status) => {
  if (status === "opened" || status === "viewed") return Eye;
  if (status === "draft") return FilePlus2;
  return Send;
};

const relativeTime = (dateString) => {
  const d = new Date(dateString);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function ActivityPanel({ rows, loading }) {
  const recent = rows.slice(0, 8);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <h3 className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
            ))
          : recent.map((row) => {
              const Icon = eventIcon(row.status);
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-slate-50 dark:bg-slate-700 p-2 text-slate-500 dark:text-slate-400">
                      <Icon size={14} className="text-slate-500 dark:text-slate-400" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {row.campaign_name} · <span className="text-blue-600 dark:text-blue-400 font-bold">{row.channel}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{row.status}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    <Clock3 size={11} />
                    {relativeTime(row.sent_at)}
                  </span>
                </div>
              );
            })}
        {!loading && recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No recent activity.
          </div>
        ) : null}
      </div>
    </div>
  );
}

