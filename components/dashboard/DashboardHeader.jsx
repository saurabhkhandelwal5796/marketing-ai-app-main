"use client";

import { Download, RefreshCw } from "lucide-react";

export default function DashboardHeader({ days, setDays, refresh, loading }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Marketing Analytics Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">Enterprise campaign insights across channels</p>
      </div>
      
      <div className="flex items-center gap-3">
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="cursor-pointer appearance-none rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 pr-8 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 hover:bg-slate-50"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="all">Yearly / All Time</option>
        </select>
        
        <button
          onClick={() => window.print()}
          className="group flex cursor-pointer items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        >
          <Download size={16} className="text-slate-500 transition-colors group-hover:text-indigo-600" />
          Export PDF
        </button>
        
        <button
          onClick={refresh}
          disabled={loading}
          className="group flex cursor-pointer items-center justify-center rounded-[12px] bg-slate-900 p-2.5 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          title="Refresh Data"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}
