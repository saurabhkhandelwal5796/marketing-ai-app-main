"use client";

import { Megaphone, Mail, Globe, MessageCircle, TrendingUp, TrendingDown, ClipboardList, Flag, CheckCircle2 } from "lucide-react";

function KPICard({ title, value, growth, subText, icon: Icon, loading }) {
  const isPositive = growth >= 0;
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="flex justify-between"><div className="h-4 w-24 bg-slate-100 rounded"></div><div className="h-8 w-8 bg-slate-100 rounded-full"></div></div>
          <div className="h-8 w-16 bg-slate-100 rounded"></div>
          <div className="h-3 w-24 bg-slate-100 rounded"></div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
              <Icon size={18} strokeWidth={2} />
            </div>
          </div>
          
          <div className="mt-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</span>
              {growth !== undefined && (
                <div className={`flex items-center gap-1 text-[11px] font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(growth)}%
                </div>
              )}
            </div>
            {subText && (
              <p className="mt-1 text-xs font-medium text-slate-400">{subText}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PrimaryKPIs({ metrics, loading }) {
  return (
    <div className="space-y-6">
      {/* ROW 1: Campaign + Tasks */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KPICard loading={loading} title="Open Campaigns" value={metrics.openCampaigns || 0} growth={12.4} subText="Overall" icon={Megaphone} />
        <KPICard loading={loading} title="Closed Campaigns" value={metrics.closedCampaigns || 0} growth={8.1} subText="This year" icon={CheckCircle2} />
        <KPICard loading={loading} title="Open Tasks" value={metrics.openTasks || 0} growth={-2.3} subText="Overall" icon={ClipboardList} />
        <KPICard loading={loading} title="Closed Tasks" value={metrics.closedTasks || 0} growth={15.2} subText="This year" icon={CheckCircle2} />
      </div>

      {/* ROW 2: Milestones */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <KPICard loading={loading} title="Open Milestones" value={metrics.openMilestones || 0} growth={5.5} subText="Overall" icon={Flag} />
        <KPICard loading={loading} title="Closed Milestones" value={metrics.closedMilestones || 0} growth={20.1} subText="This year" icon={CheckCircle2} />
      </div>

      {/* ROW 3: Channels */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <KPICard loading={loading} title="Emails Sent" value={metrics.totalEmails || 0} growth={18.5} subText="All time" icon={Mail} />
        <KPICard loading={loading} title="LinkedIn Posts" value={metrics.totalLinkedIn || 0} growth={42.3} subText="All time" icon={Globe} />
        <KPICard loading={loading} title="WhatsApp Msgs" value={metrics.totalWhatsApp || 0} growth={-5.1} subText="All time" icon={MessageCircle} />
      </div>
    </div>
  );
}
