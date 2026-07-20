"use client";

import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { CALENDAR_VIEWS, formatMonthTitle } from "../../lib/calendarUtils";

const VIEW_OPTIONS = [
  { value: CALENDAR_VIEWS.MONTH, label: "Month" },
  { value: CALENDAR_VIEWS.WEEK, label: "Week" },
  { value: CALENDAR_VIEWS.DAY, label: "Day" },
];

export default function CalendarHeader({
  activeDate,
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onCreateMeeting,
  totalEvents = 0,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Marketing Calendar</h1>
          <p className="text-sm font-medium text-slate-500">
            {totalEvents} Active {totalEvents === 1 ? 'Campaign' : 'Campaigns'}
          </p>
        </div>
        <div className="hidden h-10 w-px bg-slate-200 sm:block"></div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="min-w-[120px] text-center text-sm font-semibold text-slate-800">
            {formatMonthTitle(activeDate)}
          </h2>
          <button
            onClick={onNext}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={onToday}
            className="ml-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Segmented Control */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onViewChange(option.value)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-all ${
                option.value === view
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          <Filter size={16} />
          <span className="hidden sm:inline">Filter</span>
        </button>

        <button
          onClick={onCreateMeeting}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:scale-[0.98]"
        >
          <Plus size={16} />
          New Event
        </button>
      </div>
    </div>
  );
}
