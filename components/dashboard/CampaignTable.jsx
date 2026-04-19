"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, FileWarning, Plus } from "lucide-react";
import Link from "next/link";

const statusClass = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
  completed: "bg-blue-50 text-blue-700 ring-blue-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-500/20",
  draft: "bg-amber-50 text-amber-700 ring-amber-500/20",
};

function SortableHeader({ label, sortKey, currentSort, sortDir, onSort, align = "left" }) {
  const isActive = currentSort === sortKey;
  const isAsc = isActive && sortDir === "asc";
  const isDesc = isActive && sortDir === "desc";

  return (
    <th 
      className={`sticky top-0 z-10 bg-slate-50 px-5 py-3 text-[12px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer group hover:bg-slate-100 transition-colors select-none border-b border-slate-200 ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}>
        <span className={isActive ? "text-indigo-600 drop-shadow-sm" : ""}>{label}</span>
        {isAsc ? (
          <ArrowUp size={14} className="text-indigo-600" />
        ) : isDesc ? (
          <ArrowDown size={14} className="text-indigo-600" />
        ) : (
          <ArrowUpDown size={14} className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </th>
  );
}

export default function CampaignTable({ rows, campaigns = [], loading }) {
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Merge campaign data with log data (rows)
  const tableRows = useMemo(() => {
    return campaigns.map((campaign) => {
      // Find matching logs for this campaign to calculate open/click rates
      const campaignLogs = rows.filter(r => r.campaign_id === campaign.id);
      
      let totalRecipients = 0;
      let totalOpens = 0;
      let totalClicks = 0;

      if (campaignLogs.length > 0) {
        totalRecipients = campaignLogs.length;
        totalOpens = campaignLogs.filter(r => r.opens > 0 || r.status === "opened").length;
        totalClicks = campaignLogs.filter(r => r.clicks > 0).length;
      } else {
        // Fallback to checking recipient string if no direct logs but we have recipients field
        const recList = String(campaign.recipients || campaign.company || "").split(",").filter(Boolean);
        totalRecipients = recList.length;
      }

      const openRate = totalRecipients ? ((totalOpens / totalRecipients) * 100) : 0;
      const clickRate = totalRecipients ? ((totalClicks / totalRecipients) * 100) : 0;

      return {
        id: campaign.id,
        campaign_name: campaign.name || "Untitled Campaign",
        status: (campaign.status || "draft").toLowerCase(),
        recipients: campaign.company || campaign.recipients || "-",
        opens: openRate,
        clicks: clickRate,
        created_at: campaign.created_at || new Date().toISOString(),
      };
    });
  }, [rows, campaigns]);

  const sortedRows = useMemo(() => {
    const list = [...tableRows];
    list.sort((a, b) => {
      const av = a?.[sortBy] ?? "";
      const bv = b?.[sortBy] ?? "";
      const comp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === "asc" ? comp : -comp;
    });
    return list;
  }, [tableRows, sortBy, sortDir]);

  const onSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Recent Campaigns</h3>
          <p className="mt-0.5 text-xs text-slate-500">Track your latest campaign performance metrics.</p>
        </div>
        {tableRows.length > 0 && (
          <Link href="/campaigns" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
            View All
          </Link>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-10 animate-pulse rounded-lg bg-slate-100 w-full" />
            ))}
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-4 border border-slate-100">
              <FileWarning size={28} />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">No campaigns found</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-[250px]">You haven&apos;t created any campaigns in this period.</p>
            <Link 
              href="/create-post" 
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              Create Campaign
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr>
                <SortableHeader label="Campaign Name" sortKey="campaign_name" currentSort={sortBy} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Status" sortKey="status" currentSort={sortBy} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Recipients / Target" sortKey="recipients" currentSort={sortBy} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Open Rate" sortKey="opens" currentSort={sortBy} sortDir={sortDir} onSort={onSort} align="right" />
                <SortableHeader label="Click Rate" sortKey="clicks" currentSort={sortBy} sortDir={sortDir} onSort={onSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.slice(0, 10).map((row) => (
                <tr key={row.id} className="group transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 max-w-[200px] truncate font-medium text-slate-800" title={row.campaign_name}>
                    {row.campaign_name}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset ${statusClass[row.status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 max-w-[200px] truncate text-slate-500" title={row.recipients}>
                    {row.recipients}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-semibold text-slate-700">{row.opens.toFixed(1)}%</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-semibold text-slate-700">{row.clicks.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
