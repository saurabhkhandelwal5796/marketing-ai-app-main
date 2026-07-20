"use client";

import { Target, CheckSquare, Flag, Share2 } from "lucide-react";

function MetricGroup({ title, icon: Icon, metrics, loading }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-[14px] font-bold tracking-tight text-slate-800">{title}</h4>
        <Icon size={16} className="text-slate-400" />
      </div>
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: metrics.length }).map((_, i) => (
            <div key={i} className="flex justify-between h-4 w-full bg-slate-100 animate-pulse rounded"></div>
          ))
        ) : (
          metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-slate-500">{m.label}</span>
              <span className="font-bold text-slate-900">{m.value}</span>
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
