"use client";

import { Sparkles, ArrowRight, Lightbulb } from "lucide-react";

export default function SmartInsights({ loading }) {
  if (loading) {
    return <div className="h-28 animate-pulse rounded-xl bg-slate-100"></div>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Decorative background glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-400 opacity-10 blur-3xl"></div>
      
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100">
            <Lightbulb size={24} strokeWidth={2} className="text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI Insight</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                <Sparkles size={10} /> High Confidence
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700 max-w-2xl leading-relaxed">
              Campaign <strong className="text-indigo-600 font-semibold">&quot;Q4 Launch&quot;</strong> is performing 12% below your historical benchmark. Based on audience data, adjusting your cold email sequence subject lines to be more personalized could improve open rates by an estimated 15%.
            </p>
          </div>
        </div>
        
        <button className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[0.98] hover:bg-indigo-700 hover:shadow-md sm:w-auto">
          Apply Recommendation
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
