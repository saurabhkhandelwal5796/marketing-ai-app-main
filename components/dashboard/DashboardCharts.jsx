"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

export default function DashboardCharts({ rows, campaigns, loading }) {
  // 1. Process Data for Line Chart (Open vs Click Trend over time)
  const lineChartData = useMemo(() => {
    if (!rows.length) return [];
    
    // Group by date (YYYY-MM-DD)
    const grouped = rows.reduce((acc, row) => {
      if (!row.sent_at) return acc;
      const date = new Date(row.sent_at).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = { date, Opens: 0, Clicks: 0 };
      
      acc[date].Opens += (Number(row.opens) > 0 || row.status === "opened") ? 1 : 0;
      acc[date].Clicks += (Number(row.clicks) > 0 || row.status === "clicked") ? 1 : 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-14); // Last 14 active days
  }, [rows]);

  // 2. Process Data for Pie Chart & Bar Chart (Channels)
  const { pieData, barData } = useMemo(() => {
    let email = 0, linkedin = 0, whatsapp = 0;
    
    // Count from rows if channel exists, otherwise fallback to campaigns
    if (rows.length > 0) {
      rows.forEach(r => {
        const ch = String(r.channel || "").toLowerCase();
        if (ch === "email") email++;
        else if (ch === "linkedin") linkedin++;
        else if (ch === "whatsapp") whatsapp++;
        else email++; // Default fallback for generic logs
      });
    } else {
      campaigns.forEach(c => {
        const type = String(c.type || "").toLowerCase();
        if (type.includes("email") || type.includes("newsletter")) email++;
        else if (type.includes("linkedin")) linkedin++;
        else if (type.includes("whatsapp")) whatsapp++;
        else email++;
      });
    }

    const pie = [
      { name: "Email", value: email, color: "#6366f1" },
      { name: "LinkedIn", value: linkedin, color: "#0ea5e9" },
      { name: "WhatsApp", value: whatsapp, color: "#22c55e" },
    ].filter(item => item.value > 0);

    const bar = [
      { channel: "Email", count: email },
      { channel: "LinkedIn", count: linkedin },
      { channel: "WhatsApp", count: whatsapp }
    ];

    return { pieData: pie, barData: bar };
  }, [rows, campaigns]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="col-span-1 h-[350px] animate-pulse rounded-xl bg-slate-100 lg:col-span-7"></div>
        <div className="col-span-1 h-[350px] animate-pulse rounded-xl bg-slate-100 lg:col-span-5"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* LEFT: Line Chart (60%) */}
        <div className="col-span-1 flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Engagement Trend</h3>
            <p className="text-xs text-slate-500">Opens vs Clicks over time</p>
          </div>
          
          <div className="h-[280px] w-full">
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Opens" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Clicks" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Not enough data to display trend</div>
            )}
          </div>
        </div>

        {/* RIGHT: Pie Chart (40%) */}
        <div className="col-span-1 flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Channel Distribution</h3>
            <p className="text-xs text-slate-500">Volume breakdown by platform</p>
          </div>
          
          <div className="h-[280px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No channel data available</div>
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH: Bar Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Campaign Volume</h3>
          <p className="text-xs text-slate-500">Total activities recorded per channel</p>
        </div>
        
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="channel" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
