"use client";



function ProgressBar({ label, value, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[13px] text-slate-400 font-medium">
        <span>{label}</span>
        <span className="font-bold text-white drop-shadow-sm">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden shadow-inner">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function InsightPanel({ totalCampaigns = 0, activeCampaigns = 0, performancePercent = 0, breakdown = {} }) {
  const confirmedCount = Number(breakdown.confirmedCount || 0);
  const pendingCount = Number(breakdown.pendingCount || 0);

  return (
    <div className="flex flex-col h-full rounded-[24px] border border-white/[0.08] bg-[#121826]/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-wide text-white">AI Insights</h2>
          <p className="mt-1.5 text-[13px] font-medium text-slate-400">Performance signals from recent activity.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-sm backdrop-blur-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Performance</div>
          <div className="mt-0.5 text-xl font-extrabold text-white">{performancePercent}%</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
          <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Total Campaigns</div>
          <div className="mt-2 text-3xl font-extrabold text-white">{totalCampaigns}</div>
        </div>
        <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
          <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Active Campaigns</div>
          <div className="mt-2 text-3xl font-extrabold text-white">{activeCampaigns}</div>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <ProgressBar label="Confirmed" value={confirmedCount} max={Math.max(1, totalCampaigns)} />
        <ProgressBar label="Pending" value={pendingCount} max={Math.max(1, totalCampaigns)} />
      </div>

      <div className="mt-auto pt-8">
        <div className="rounded-[16px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5 shadow-inner">
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Next Best Action</div>
          <div className="mt-2 text-[13.5px] font-medium leading-relaxed text-indigo-100/90">
            {performancePercent >= 60 ? "Keep momentum: generate content for high-performing campaigns." : "Start with 1-2 campaigns and iterate weekly based on activity."}
          </div>
        </div>
      </div>
    </div>
  );
}

