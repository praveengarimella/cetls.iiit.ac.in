import { isFieldPending, type CetlsEvent } from "./types.ts";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHORT_WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface IstParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  weekday: number; // 0-6 (Sun-Sat)
  isoDate: string; // YYYY-MM-DD
}

/**
 * Normalizes an ISO date or datetime string into an explicit +05:30 ISO 8601 string.
 */
export function normalizeIstIso(input: string, isEnd = false): string {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isEnd ? `${trimmed}T23:59:59+05:30` : `${trimmed}T00:00:00+05:30`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00+05:30`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}+05:30`;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ISO datetime: ${input}`);
  }
  const istMs = d.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  const hh = String(ist.getUTCHours()).padStart(2, "0");
  const mm = String(ist.getUTCMinutes()).padStart(2, "0");
  const ss = String(ist.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}+05:30`;
}

export function nowIstIso(): string {
  return normalizeIstIso(new Date().toISOString());
}

export function todayIstDate(): string {
  return nowIstIso().slice(0, 10);
}

/**
 * Extracts IST calendar/clock components from any ISO date or datetime string.
 */
export function getIstParts(iso: string): IstParts {
  const normalized = normalizeIstIso(iso);
  const d = new Date(normalized);
  const istMs = d.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const second = ist.getUTCSeconds();
  const weekday = ist.getUTCDay();
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, hour, minute, second, weekday, isoDate };
}

export function toEpochMs(iso: string, isEnd = false): number {
  return new Date(normalizeIstIso(iso, isEnd)).getTime();
}

export function formatTime12hIst(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const minStr = String(minute).padStart(2, "0");
  return `${h12}:${minStr} ${period}`;
}

/**
 * Formats a full human-readable & screen-reader friendly date in IST (e.g. "Saturday, 5 September 2026").
 */
export function formatFullDateIst(iso: string): string {
  const p = getIstParts(iso);
  return `${WEEKDAY_NAMES[p.weekday]}, ${p.day} ${MONTH_NAMES[p.month - 1]} ${p.year}`;
}

export function formatShortDateIst(iso: string): string {
  const p = getIstParts(iso);
  return `${SHORT_WEEKDAY_NAMES[p.weekday]}, ${p.day} ${SHORT_MONTH_NAMES[p.month - 1]} ${p.year}`;
}

export function formatDayMonthYearIst(iso: string): string {
  const p = getIstParts(iso);
  return `${p.day} ${MONTH_NAMES[p.month - 1]} ${p.year}`;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Formats an event's time display in IST, respecting allDay and pendingFields ("start time" / "end time").
 */
export function formatEventTimeIst(
  event: Pick<CetlsEvent, "start" | "end" | "allDay" | "pendingFields" | "status">,
): string {
  const startPending = isFieldPending(event, "start time");
  const endPending = isFieldPending(event, "end time");

  if (startPending && endPending) {
    return "Time: To be confirmed (IST)";
  }
  if (event.allDay && !startPending && !endPending) {
    return "All day (IST)";
  }
  const s = getIstParts(event.start);
  const e = getIstParts(event.end);
  const startLabel = startPending ? "To be confirmed" : formatTime12hIst(s.hour, s.minute);
  const endLabel = endPending ? "To be confirmed" : formatTime12hIst(e.hour, e.minute);
  return `${startLabel} – ${endLabel} IST`;
}

/**
 * Formats both date and time in IST for cards and detail views.
 */
export function formatEventDateTimeSummaryIst(
  event: Pick<CetlsEvent, "start" | "end" | "allDay" | "pendingFields" | "status">,
  occurrenceStart?: string,
  occurrenceEnd?: string,
): { dateLabel: string; timeLabel: string; ariaLabel: string } {
  const startIso = occurrenceStart ?? event.start;
  const endIso = occurrenceEnd ?? event.end;
  const s = getIstParts(startIso);
  const e = getIstParts(endIso);
  const sameDay = s.isoDate === e.isoDate;

  const dateLabel = sameDay
    ? formatFullDateIst(startIso)
    : `${formatDayMonthYearIst(startIso)} – ${formatDayMonthYearIst(endIso)}`;

  const timeLabel = formatEventTimeIst({
    ...event,
    start: startIso,
    end: endIso,
  });

  return {
    dateLabel,
    timeLabel,
    ariaLabel: `${dateLabel}, ${timeLabel}`,
  };
}
