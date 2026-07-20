"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import CampaignRow from "./CampaignRow";

function SortableHeader({ label, sortKey, currentSort, onSort, align = "left" }) {
  const isAsc = currentSort === `${sortKey}_asc`;
  const isDesc = currentSort === `${sortKey}_desc`;

  return (
    <th 
      className={`px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer group hover:bg-slate-50 transition-colors duration-200 select-none ${align === "center" ? "text-center" : "text-left"}`}
      onClick={() => {
        if (isAsc) onSort(`${sortKey}_desc`);
        else if (isDesc) onSort('last_activity_desc');
        else onSort(`${sortKey}_asc`);
      }}
      title={`Sort by ${label}`}
    >
      <div className={`flex items-center gap-1.5 ${align === "center" ? "justify-center" : "justify-start"}`}>
        <span className={isAsc || isDesc ? "text-indigo-600 drop-shadow-sm transition-colors" : "transition-colors group-hover:text-slate-700"}>{label}</span>
        {isAsc ? (
          <ArrowUp size={14} className="text-indigo-600 opacity-100 transition-all duration-200" />
        ) : isDesc ? (
          <ArrowDown size={14} className="text-indigo-600 opacity-100 transition-all duration-200" />
        ) : (
          <ArrowUpDown size={14} className="text-slate-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        )}
      </div>
    </th>
  );
}

export default function CampaignTable({
  rows = [],
  loading = false,
  totalCampaignCount = 0,
  selectedCampaignIds = [],
  onToggleSelectAll,
  allSelectedVisible = false,
  onToggleSelected,
  onRowClick,
  onCampaignNameClick,
  emptyCtaLabel = "+ New Campaign",
  onEmptyCta,
  sortValue,
  onSortChange,
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500">S.No.</th>
              <SortableHeader label="Campaign Name" sortKey="name" currentSort={sortValue} onSort={onSortChange} />
              <SortableHeader label="Created By" sortKey="created_by" currentSort={sortValue} onSort={onSortChange} />
              <SortableHeader label="Created" sortKey="created" currentSort={sortValue} onSort={onSortChange} />
              <SortableHeader label="Last Modified" sortKey="last_activity" currentSort={sortValue} onSort={onSortChange} />
              <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 text-center">
                <input
                  type="checkbox"
                  checked={allSelectedVisible}
                  onClick={(e) => e.stopPropagation()}
                  onChange={onToggleSelectAll}
                  aria-label="Select all campaigns"
                  className="cursor-pointer h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td colSpan={6} className="px-6 py-5">
                      <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))}
              </>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12">
                  <div className="mx-auto max-w-md text-center">
                    {totalCampaignCount > 0 ? (
                      <>
                        <div className="text-base font-semibold text-slate-900">No results.</div>
                        <div className="mt-2 text-sm text-slate-500">Try adjusting your search or filters.</div>
                      </>
                    ) : (
                      <>
                        <div className="text-base font-semibold text-slate-900">No campaigns yet.</div>
                        <div className="mt-2 text-sm text-slate-500">Create your first campaign.</div>
                        {onEmptyCta ? (
                          <div className="mt-6 flex justify-center">
                            <button
                              type="button"
                              onClick={onEmptyCta}
                              className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
                            >
                              {emptyCtaLabel}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => {
                const selected = selectedCampaignIds.includes(item.id);
                return (
                  <CampaignRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    selected={selected}
                    onToggleSelected={onToggleSelected}
                    onRowClick={onRowClick}
                    onCampaignNameClick={onCampaignNameClick}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

