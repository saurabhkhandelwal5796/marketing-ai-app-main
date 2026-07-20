"use client";

import { Target, CheckSquare, Flag, Share2 } from "lucide-react";

function MetricGroup({ title, icon: Icon, metrics, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-800 dark:border-slate-700">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</h4>
        <Icon size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: metrics.length }).map((_, i) => (
            <div key={i} className="flex justify-between h-4 w-full bg-slate-100 dark:bg-slate-700 animate-pulse rounded"></div>
          ))
        ) : (
          metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">{m.label}</span>
              <span className="font-bold text-slate-900 dark:text-white">{m.value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SecondaryGrid({ metrics, loading }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
      <MetricGroup
        title="Campaigns"
        icon={Target}
        loading={loading}
        metrics={[
          { label: "Total Open", value: metrics.openCampaigns },
          { label: "Total Closed", value: metrics.closedCampaigns },
        ]}
      />
      <MetricGroup
        title="Tasks"
        icon={CheckSquare}
        loading={loading}
        metrics={[
          { label: "Total Open", value: metrics.openTasks },
          { label: "Total Closed", value: metrics.closedTasks },
        ]}
      />
      <MetricGroup
        title="Milestones"
        icon={Flag}
        loading={loading}
        metrics={[
          { label: "Total Open", value: metrics.openMilestones },
          { label: "Total Closed", value: metrics.closedMilestones },
        ]}
      />
      <MetricGroup
        title="Engagement"
        icon={Share2}
        loading={loading}
        metrics={[
          { label: "Emails Sent", value: metrics.totalEmails },
          { label: "LinkedIn Posts", value: metrics.totalLinkedIn },
          { label: "WhatsApp Msgs", value: metrics.totalWhatsApp },
        ]}
      />
    </div>
  );
}
