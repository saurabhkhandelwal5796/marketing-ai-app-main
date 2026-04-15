"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Previous"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onNext}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Next"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={onToday}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Today
        </button>
        <h1 className="pl-2 text-lg font-semibold text-slate-900">{formatMonthTitle(activeDate)}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-xl border border-slate-300 bg-white p-1">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onViewChange(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                option.value === view ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={onCreateMeeting}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus size={16} />
          New Meeting
        </button>
      </div>
    </div>
  );
}
