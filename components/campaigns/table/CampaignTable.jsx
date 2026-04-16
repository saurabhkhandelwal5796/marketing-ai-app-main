"use client";

import CampaignRow from "./CampaignRow";

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
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121826]/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0B0F1A]/90 backdrop-blur-xl">
            <tr className="border-b border-white/[0.08]">
              <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-400">S.No.</th>
              <th className="px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-400">
                Campaign Name
              </th>
              <th className="px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-400">Created By</th>
              <th className="px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-400">Created</th>
              <th className="px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-400">Last Modified</th>
              <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-400 text-center">
                <input
                  type="checkbox"
                  checked={allSelectedVisible}
                  onClick={(e) => e.stopPropagation()}
                  onChange={onToggleSelectAll}
                  aria-label="Select all campaigns"
                  className="cursor-pointer h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 transition-all focus:ring-indigo-500 focus:ring-offset-0"
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-t border-white/[0.04]">
                    <td colSpan={7} className="px-6 py-5">
                      <div className="h-5 w-full animate-pulse rounded bg-white/[0.05]" />
                    </td>
                  </tr>
                ))}
              </>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12">
                  <div className="mx-auto max-w-md text-center">
                    {totalCampaignCount > 0 ? (
                      <>
                        <div className="text-base font-semibold text-white">No results.</div>
                        <div className="mt-2 text-sm text-slate-400">Try adjusting your search or filters.</div>
                      </>
                    ) : (
                      <>
                        <div className="text-base font-semibold text-white">No campaigns yet.</div>
                        <div className="mt-2 text-sm text-slate-400">Create your first campaign.</div>
                        {onEmptyCta ? (
                          <div className="mt-6 flex justify-center">
                            <button
                              type="button"
                              onClick={onEmptyCta}
                              className="inline-flex rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)]"
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

