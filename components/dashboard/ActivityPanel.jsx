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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Activity</h3>
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))
          : recent.map((row) => {
              const Icon = eventIcon(row.status);
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-slate-100 p-2">
                      <Icon size={14} className="text-slate-600" />
                    </span>
                    <div>
                      <p className="text-sm text-slate-800">
                        {row.campaign_name} · {row.channel}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">{row.status}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 size={12} />
                    {relativeTime(row.sent_at)}
                  </span>
                </div>
              );
            })}
        {!loading && recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            No recent activity.
          </div>
        ) : null}
      </div>
    </div>
  );
}

