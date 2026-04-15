"use client";

import {
  HOURS,
  addDays,
  assignOverlapColumns,
  buildMonthGrid,
  buildWeekDays,
  CALENDAR_VIEWS,
  formatDayNumber,
  formatTime,
  formatWeekday,
  getMeetingsForDay,
  getPositionInDay,
  isSameDay,
} from "../../lib/calendarUtils";

const TYPE_COLORS = {
  Online: "bg-blue-100 text-blue-700 border-blue-200",
  Offline: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function MeetingChip({ meeting, onClick }) {
  return (
    <button
      onClick={() => onClick(meeting)}
      className={`w-full rounded-lg border px-2 py-1 text-left text-xs font-medium ${
        TYPE_COLORS[meeting.meeting_type] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      <p className="truncate">{meeting.title}</p>
      <p className="truncate opacity-80">
        {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
      </p>
    </button>
  );
}

function TimeGridDayColumn({ day, meetings, today, onMeetingClick }) {
  const dayMeetings = assignOverlapColumns(getMeetingsForDay(meetings, day));

  return (
    <div className="relative h-[1200px] border-l border-slate-200">
      {HOURS.map((hour) => (
        <div key={hour} className="h-[50px] border-b border-slate-100" />
      ))}
      {dayMeetings.map((meeting) => {
        const { top, height } = getPositionInDay(meeting.start_time, meeting.end_time);
        const width = 100 / meeting.overlapCount;
        const left = meeting.overlapColumn * width;
        return (
          <button
            key={meeting.id}
            onClick={() => onMeetingClick(meeting)}
            className={`absolute overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm ${
              TYPE_COLORS[meeting.meeting_type] || "bg-slate-100 text-slate-700 border-slate-200"
            } ${isSameDay(day, today) ? "ring-1 ring-blue-200" : ""}`}
            style={{
              top: `${top}%`,
              left: `calc(${left}% + 4px)`,
              width: `calc(${width}% - 8px)`,
              height: `max(${height}%, 22px)`,
            }}
          >
            <p className="truncate font-semibold">{meeting.title}</p>
            <p className="truncate">
              {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ activeDate, meetings, onMeetingClick }) {
  const today = new Date();
  const days = buildMonthGrid(activeDate);
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div key={idx} className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          {formatWeekday(addDays(new Date(2024, 0, 1), idx), "short")}
        </div>
      ))}
      {days.map((day) => {
        const dayMeetings = getMeetingsForDay(meetings, day);
        const inCurrentMonth = day.getMonth() === activeDate.getMonth();
        return (
          <div
            key={day.toISOString()}
            className={`min-h-36 space-y-1 border-r border-b border-slate-100 p-2 ${
              inCurrentMonth ? "bg-white" : "bg-slate-50/70"
            }`}
          >
            <div
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                isSameDay(day, today) ? "bg-blue-600 text-white" : "text-slate-600"
              }`}
            >
              {formatDayNumber(day)}
            </div>
            <div className="space-y-1">
              {dayMeetings.slice(0, 3).map((meeting) => (
                <MeetingChip key={meeting.id} meeting={meeting} onClick={onMeetingClick} />
              ))}
              {dayMeetings.length > 3 ? (
                <p className="px-1 text-xs text-slate-500">+{dayMeetings.length - 3} more</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekOrDayView({ activeDate, meetings, onMeetingClick, view }) {
  const today = new Date();
  const days = view === CALENDAR_VIEWS.DAY ? [activeDate] : buildWeekDays(activeDate);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-slate-200 bg-slate-50 p-2" />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-b border-l border-slate-200 bg-slate-50 p-2 text-center">
            <p className="text-xs font-semibold uppercase text-slate-500">{formatWeekday(day, "short")}</p>
            <p
              className={`mx-auto mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                isSameDay(day, today) ? "bg-blue-600 text-white" : "text-slate-700"
              }`}
            >
              {formatDayNumber(day)}
            </p>
          </div>
        ))}

        <div className="bg-white">
          {HOURS.map((hour) => (
            <div key={hour} className="h-[50px] border-b border-slate-100 pr-2 pt-0.5 text-right text-xs text-slate-400">
              {hour === 0 ? "" : `${hour}:00`}
            </div>
          ))}
        </div>
        {days.map((day) => (
          <TimeGridDayColumn
            key={day.toISOString()}
            day={day}
            meetings={meetings}
            today={today}
            onMeetingClick={onMeetingClick}
          />
        ))}
      </div>
    </div>
  );
}

export default function CalendarGrid({ view, activeDate, meetings, onMeetingClick }) {
  if (view === CALENDAR_VIEWS.MONTH) {
    return <MonthView activeDate={activeDate} meetings={meetings} onMeetingClick={onMeetingClick} />;
  }
  return (
    <WeekOrDayView view={view} activeDate={activeDate} meetings={meetings} onMeetingClick={onMeetingClick} />
  );
}
