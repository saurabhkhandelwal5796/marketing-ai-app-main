"use client";

import { BarChart3, MailCheck, MousePointerClick, Send } from "lucide-react";

const items = [
  { key: "sent", label: "Total Campaigns Sent", icon: Send },
  { key: "opens", label: "Total Opens", icon: MailCheck },
  { key: "clicks", label: "Total Clicks", icon: MousePointerClick },
  { key: "conversion_rate", label: "Conversion Rate %", icon: BarChart3 },
];

export default function DashboardCards({ totals }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const value = totals?.[item.key] ?? 0;
        return (
          <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{item.label}</p>
              <Icon size={18} className="text-blue-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          </div>
        );
      })}
    </div>
  );
}

