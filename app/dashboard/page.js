"use client";

import { useMemo, useState, useEffect } from "react";
import KPISection from "../../components/dashboard/KPISection";
import ChartsSection from "../../components/dashboard/ChartsSection";
import CampaignTable from "../../components/dashboard/CampaignTable";
import ActivityPanel from "../../components/dashboard/ActivityPanel";

const toPct = (num, den) => {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(1));
};

const withinDays = (dateStr, days) => {
  if (days === "all") return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));
  return new Date(dateStr) >= cutoff;
};

export default function DashboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaign-logs?limit=500");
      const data = await res.json();
      if (res.ok && !data?.error) setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredRows = useMemo(() => rows.filter((row) => withinDays(row.sent_at, days)), [rows, days]);

  const metrics = useMemo(() => {
    const totalSent = filteredRows.length;
    const totalOpens = filteredRows.reduce((sum, row) => sum + Number(row.opens || 0), 0);
    const totalClicks = filteredRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    const failedCount = filteredRows.filter((row) => String(row.status).toLowerCase() === "failed").length;
    const sentCount = totalSent;

    return {
      totalSent,
      totalOpens,
      totalClicks,
      openRate: toPct(totalOpens, totalSent),
      ctr: toPct(totalClicks, totalSent),
      deliverySuccessRate: toPct(sentCount - failedCount, sentCount),
      sentCount,
      failedCount,
    };
  }, [filteredRows]);

  const barData = useMemo(() => {
    const map = {};
    for (const row of filteredRows) {
      const key = row.channel || "Unknown";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([channel, sent]) => ({ channel, sent }));
  }, [filteredRows]);

  const pieData = useMemo(
    () => barData.map((item) => ({ name: item.channel, value: item.sent })),
    [barData]
  );

  const lineData = useMemo(() => {
    const map = {};
    for (const row of filteredRows) {
      const date = new Date(row.sent_at).toISOString().slice(0, 10);
      if (!map[date]) map[date] = { date, opens: 0, clicks: 0 };
      map[date].opens += Number(row.opens || 0);
      map[date].clicks += Number(row.clicks || 0);
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Marketing Analytics Dashboard</h1>
          <p className="text-sm text-slate-500">Enterprise campaign insights across channels and activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={refresh}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <KPISection metrics={metrics} loading={loading} />
      <ChartsSection lineData={lineData} barData={barData} pieData={pieData} loading={loading} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <CampaignTable rows={filteredRows} loading={loading} />
        </div>
        <div className="xl:col-span-4">
          <ActivityPanel rows={filteredRows} loading={loading} />
        </div>
      </div>
    </main>
  );
}
