"use client";

import { useMemo, useState } from "react";

const statusClass = {
  sent: "bg-blue-50 text-blue-700",
  opened: "bg-emerald-50 text-emerald-700",
  viewed: "bg-violet-50 text-violet-700",
  failed: "bg-red-50 text-red-700",
  draft: "bg-amber-50 text-amber-700",
};

export default function CampaignTable({ rows, loading }) {
  const [sortBy, setSortBy] = useState("sent_at");
  const [sortDir, setSortDir] = useState("desc");

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = a?.[sortBy] ?? "";
      const bv = b?.[sortBy] ?? "";
      const comp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === "asc" ? comp : -comp;
    });
    return list;
  }, [rows, sortBy, sortDir]);

  const onSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const thClass = "cursor-pointer px-3 py-2 text-left text-xs font-semibold text-slate-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Campaign Logs</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className={thClass} onClick={() => onSort("campaign_name")}>
                Campaign Name
              </th>
              <th className={thClass} onClick={() => onSort("channel")}>
                Channel
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Recipients</th>
              <th className={thClass} onClick={() => onSort("sent_at")}>
                Sent At
              </th>
              <th className={thClass} onClick={() => onSort("opens")}>
                Opens
              </th>
              <th className={thClass} onClick={() => onSort("clicks")}>
                Clicks
              </th>
              <th className={thClass} onClick={() => onSort("status")}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td colSpan={7} className="px-3 py-3">
                      <div className="h-5 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : sortedRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/60">
                    <td className="px-3 py-2">{row.campaign_name}</td>
                    <td className="px-3 py-2">{row.channel}</td>
                    <td className="max-w-72 truncate px-3 py-2" title={row.recipients}>
                      {row.recipients}
                    </td>
                    <td className="px-3 py-2">{new Date(row.sent_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.opens}</td>
                    <td className="px-3 py-2">{row.clicks}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusClass[row.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
            {!loading && sortedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-slate-500">
                  No campaign logs found for selected period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

