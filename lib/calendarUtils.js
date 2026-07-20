export const CALENDAR_VIEWS = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day",
};

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

export function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfDay(d);
}

export function endOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return endOfDay(d);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

export function formatWeekday(date, format = "short") {
  return new Intl.DateTimeFormat("en-US", { weekday: format }).format(date);
}

export function formatDayNumber(date) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date);
}

export function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getRangeForView(anchorDate, view) {
  if (view === CALENDAR_VIEWS.DAY) {
    return { from: startOfDay(anchorDate), to: endOfDay(anchorDate) };
  }
  if (view === CALENDAR_VIEWS.WEEK) {
    return { from: startOfWeek(anchorDate), to: endOfWeek(anchorDate) };
  }
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  return { from: gridStart, to: gridEnd };
}

export function buildMonthGrid(anchorDate) {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const first = startOfWeek(monthStart);
  const last = endOfWeek(monthEnd);
  const days = [];
  let cursor = new Date(first);
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function buildWeekDays(anchorDate) {
  const start = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMeetingsForDay(meetings, day) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return meetings.filter((meeting) => {
    const meetingStart = new Date(meeting.start_time);
    const meetingEnd = new Date(meeting.end_time);
    return meetingStart <= dayEnd && meetingEnd >= dayStart;
  });
}

export function getPositionInDay(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const top = (startMinutes / 1440) * 100;
  const height = (Math.max(endMinutes - startMinutes, 30) / 1440) * 100;
  return { top, height };
}

export function assignOverlapColumns(dayMeetings) {
  const sorted = [...dayMeetings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const active = [];
  const positioned = [];

  sorted.forEach((meeting) => {
    const start = new Date(meeting.start_time).getTime();
    const end = new Date(meeting.end_time).getTime();
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].end <= start) active.splice(i, 1);
    }
    let column = 0;
    while (active.some((item) => item.column === column)) column += 1;
    active.push({ end, column });
    const columns = Math.max(...active.map((item) => item.column)) + 1;
    positioned.push({ ...meeting, overlapColumn: column, overlapCount: columns });
  });

  return positioned;
}
