"use client";



function ProgressBar({ label, value, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[13px] text-slate-500 font-medium">
        <span>{label}</span>
        <span className="font-bold text-slate-900">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner">
        <div className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function InsightPanel({ totalCampaigns = 0, activeCampaigns = 0, performancePercent = 0, breakdown = {} }) {
  const confirmedCount = Number(breakdown.confirmedCount || 0);
  const pendingCount = Number(breakdown.pendingCount || 0);

  return (
    <div className="flex flex-col h-full rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-wide text-slate-900">AI Insights</h2>
          <p className="mt-1.5 text-[13px] font-medium text-slate-500">Performance signals from recent activity.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Performance</div>
          <div className="mt-0.5 text-xl font-extrabold text-slate-900">{performancePercent}%</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100/50">
          <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Total Campaigns</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{totalCampaigns}</div>
        </div>
        <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100/50">
          <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Active Campaigns</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{activeCampaigns}</div>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <ProgressBar label="Confirmed" value={confirmedCount} max={Math.max(1, totalCampaigns)} />
        <ProgressBar label="Pending" value={pendingCount} max={Math.max(1, totalCampaigns)} />
      </div>

      <div className="mt-auto pt-8">
        <div className="rounded-[16px] bg-indigo-50 border border-indigo-100 p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Next Best Action</div>
          <div className="mt-2 text-[13.5px] font-medium leading-relaxed text-indigo-900">
            {performancePercent >= 60 ? "Keep momentum: generate content for high-performing campaigns." : "Start with 1-2 campaigns and iterate weekly based on activity."}
          </div>
        </div>
      </div>
    </div>
  );
}

