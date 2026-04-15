"use client";

import { MailOpen, MousePointerClick, Send, TrendingUp, CheckCircle2, Layers } from "lucide-react";

const KPI_ITEMS = [
  { key: "totalSent", label: "Total Campaigns Sent", icon: Send },
  { key: "totalOpens", label: "Total Opens", icon: MailOpen },
  { key: "totalClicks", label: "Total Clicks", icon: MousePointerClick },
  { key: "openRate", label: "Open Rate", icon: TrendingUp, suffix: "%" },
  { key: "ctr", label: "Click Through Rate", icon: Layers, suffix: "%" },
  { key: "deliverySuccessRate", label: "Delivery Success Rate", icon: CheckCircle2, suffix: "%" },
];

export default function KPISection({ metrics, loading }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPI_ITEMS.map((item) => {
          const Icon = item.icon;
          const value = metrics?.[item.key] ?? 0;
          return (
            <div
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:shadow-md"
            >
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="h-8 w-20 rounded bg-slate-200" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <Icon size={18} className="text-blue-600" />
                  </div>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {value}
                    {item.suffix || ""}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InsightCard label="Sent" value={metrics?.sentCount ?? 0} loading={loading} />
        <InsightCard label="Failed" value={metrics?.failedCount ?? 0} loading={loading} />
        <InsightCard
          label="Success %"
          value={`${metrics?.deliverySuccessRate ?? 0}%`}
          loading={loading}
        />
      </div>
    </div>
  );
}

function InsightCard({ label, value, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-16 rounded bg-slate-200" />
          <div className="h-6 w-20 rounded bg-slate-200" />
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
        </>
      )}
    </div>
  );
}

