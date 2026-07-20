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

const getEventColorStyle = (title = "", type = "") => {
  const t = title.toLowerCase();
  if (t.includes("email") || t.includes("newsletter")) return "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200";
  if (t.includes("social") || t.includes("linkedin") || t.includes("post") || t.includes("instagram")) return "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200";
  if (t.includes("blog") || t.includes("content") || t.includes("seo")) return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
  if (t.includes("influencer") || t.includes("partner") || t.includes("promo")) return "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200";
  
  if (type === "Online") return "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200";
  if (type === "Offline") return "bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200";

  return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"; // Default Meeting grey
};

function MeetingChip({ meeting, onClick }) {
  const colorClass = getEventColorStyle(meeting.title, meeting.meeting_type);
  
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(meeting); }}
      className={`w-full rounded-md border px-2 py-1 text-left text-[11px] font-semibold transition-all hover:-translate-y-[1px] hover:shadow-sm ${colorClass}`}
    >
      <p className="truncate">{meeting.title}</p>
    </button>
  );
}

function TimeGridDayColumn({ day, meetings, today, onMeetingClick, onCreateMeeting }) {
  const dayMeetings = assignOverlapColumns(getMeetingsForDay(meetings, day));

  return (
    <div 
      className="relative h-[1200px] border-l border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer"
      onClick={() => onCreateMeeting && onCreateMeeting(day)}
    >
      {HOURS.map((hour) => (
        <div key={hour} className="h-[50px] border-b border-slate-50" />
      ))}
      {dayMeetings.map((meeting) => {
        const { top, height } = getPositionInDay(meeting.start_time, meeting.end_time);
        const width = 100 / meeting.overlapCount;
        const left = meeting.overlapColumn * width;
        const colorClass = getEventColorStyle(meeting.title, meeting.meeting_type);
        
        return (
          <button
            key={meeting.id}
            onClick={(e) => { e.stopPropagation(); onMeetingClick(meeting); }}
            className={`absolute overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md ${colorClass} ${isSameDay(day, today) ? "ring-2 ring-indigo-400" : ""}`}
            style={{
              top: `${top}%`,
              left: `calc(${left}% + 4px)`,
              width: `calc(${width}% - 8px)`,
              height: `max(${height}%, 24px)`,
            }}
          >
            <p className="truncate font-bold">{meeting.title}</p>
            <p className="truncate opacity-80 text-[10px]">
              {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ activeDate, meetings, onMeetingClick, onCreateMeeting }) {
  const today = new Date();
  const days = buildMonthGrid(activeDate);
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div key={idx} className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 last:border-r-0">
          {formatWeekday(addDays(new Date(2024, 0, 1), idx), "short")}
        </div>
      ))}
      {days.map((day, idx) => {
        const dayMeetings = getMeetingsForDay(meetings, day);
        const inCurrentMonth = day.getMonth() === activeDate.getMonth();
        const isToday = isSameDay(day, today);
        
        return (
          <div
            key={day.toISOString()}
            onClick={() => onCreateMeeting && onCreateMeeting(day)}
            className={`min-h-[140px] border-r border-b border-slate-100 p-1.5 transition-colors cursor-pointer hover:bg-slate-50 group ${
              inCurrentMonth ? "bg-white" : "bg-slate-50/40 opacity-70"
            } ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}`}
          >
            <div className="flex justify-end mb-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isToday 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-600 group-hover:bg-slate-200"
                }`}
              >
                {formatDayNumber(day)}
              </div>
            </div>
            <div className="space-y-1">
              {dayMeetings.slice(0, 4).map((meeting) => (
                <MeetingChip key={meeting.id} meeting={meeting} onClick={onMeetingClick} />
              ))}
              {dayMeetings.length > 4 ? (
                <p className="px-1 pt-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600">
                  +{dayMeetings.length - 4} more
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekOrDayView({ activeDate, meetings, onMeetingClick, view, onCreateMeeting }) {
  const today = new Date();
  const days = view === CALENDAR_VIEWS.DAY ? [activeDate] : buildWeekDays(activeDate);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}>
        {/* Header Left Corner */}
        <div className="border-b border-slate-200 bg-slate-50 p-2" />
        
        {/* Day Headers */}
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className={`border-b border-l border-slate-200 bg-slate-50 p-3 text-center ${isToday ? "bg-indigo-50/50" : ""}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-indigo-600" : "text-slate-500"}`}>
                {formatWeekday(day, "short")}
              </p>
              <p
                className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700"
                }`}
              >
                {formatDayNumber(day)}
              </p>
            </div>
          );
        })}

        {/* Time Sidebar */}
        <div className="bg-white">
          {HOURS.map((hour) => (
            <div key={hour} className="h-[50px] border-b border-slate-50 pr-2 pt-1 text-right text-[10px] font-semibold text-slate-400">
              {hour === 0 ? "" : `${hour}:00`}
            </div>
          ))}
        </div>
        
        {/* Columns */}
        {days.map((day) => (
          <TimeGridDayColumn
            key={day.toISOString()}
            day={day}
            meetings={meetings}
            today={today}
            onMeetingClick={onMeetingClick}
            onCreateMeeting={onCreateMeeting}
          />
        ))}
      </div>
    </div>
  );
}

export default function CalendarGrid({ view, activeDate, meetings, onMeetingClick, onCreateMeeting }) {
  if (view === CALENDAR_VIEWS.MONTH) {
    return <MonthView activeDate={activeDate} meetings={meetings} onMeetingClick={onMeetingClick} onCreateMeeting={onCreateMeeting} />;
  }
  return (
    <WeekOrDayView view={view} activeDate={activeDate} meetings={meetings} onMeetingClick={onMeetingClick} onCreateMeeting={onCreateMeeting} />
  );
}
