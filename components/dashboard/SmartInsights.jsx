"use client";

import { Sparkles, ArrowRight, Lightbulb } from "lucide-react";

export default function SmartInsights({ loading }) {
  if (loading) {
    return <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700"></div>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/30 p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-slate-800/40 dark:border-slate-700">
      {/* Decorative background glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500 opacity-10 blur-3xl"></div>
      
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-blue-50 dark:border-slate-700">
            <Lightbulb size={24} strokeWidth={2} className="text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Insight</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                <Sparkles size={10} /> Recommendation
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed">
              Campaign <strong className="text-blue-600 dark:text-blue-400 font-bold">&quot;Q4 Launch&quot;</strong> is performing 12% below your historical benchmark. Based on audience data, adjusting your cold email sequence subject lines to be more personalized could improve open rates by an estimated 15%.
            </p>
          </div>
        </div>
        
        <button className="btn-primary group inline-flex shrink-0 items-center justify-center gap-2 px-5 py-3 text-xs font-bold sm:w-auto">
          Apply Recommendation
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
