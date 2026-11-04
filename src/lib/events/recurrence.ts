import { getIstParts, normalizeIstIso, toEpochMs } from "./ist-date.ts";
import type { CetlsEvent, ExpandedEventOccurrence } from "./types.ts";

const BYDAY_TO_WEEKDAY: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const WEEKDAY_TO_BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export interface ParsedRRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  count?: number;
  untilIsoDate?: string; // YYYY-MM-DD
  byDay?: number[]; // 0..6
  byMonthDay?: number[]; // 1..31
}

export function parseRRule(rruleStr: string): ParsedRRule | null {
  const cleaned = rruleStr
    .trim()
    .replace(/^RRULE:/i, "")
    .trim();
  if (!cleaned) return null;

  const kv: Record<string, string> = {};
  for (const part of cleaned.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) {
      kv[k.trim().toUpperCase()] = v.trim().toUpperCase();
    }
  }

  const freq = kv.FREQ as ParsedRRule["freq"] | undefined;
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) {
    return null;
  }

  const interval = Math.max(1, Number.parseInt(kv.INTERVAL ?? "1", 10) || 1);
  const count = kv.COUNT ? Math.max(1, Number.parseInt(kv.COUNT, 10) || 1) : undefined;

  let untilIsoDate: string | undefined;
  if (kv.UNTIL) {
    const u = kv.UNTIL;
    if (/^\d{8}/.test(u)) {
      untilIsoDate = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(u)) {
      untilIsoDate = u.slice(0, 10);
    }
  }

  let byDay: number[] | undefined;
  if (kv.BYDAY) {
    const days = kv.BYDAY.split(",")
      .map((d) => d.replace(/^[+-]?\d+/, "").trim())
      .map((d) => BYDAY_TO_WEEKDAY[d])
      .filter((d): d is number => typeof d === "number");
    if (days.length > 0) byDay = days;
  }

  let byMonthDay: number[] | undefined;
  if (kv.BYMONTHDAY) {
    const mds = kv.BYMONTHDAY.split(",")
      .map((n) => Number.parseInt(n.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 31);
    if (mds.length > 0) byMonthDay = mds;
  }

  return {
    freq,
    interval,
    count,
    untilIsoDate,
    byDay,
    byMonthDay,
  };
}

export function formatRRuleHumanReadable(rruleStr?: string | null): string {
  if (!rruleStr) return "";
  const parsed = parseRRule(rruleStr);
  if (!parsed) return rruleStr;
  const freqMap: Record<ParsedRRule["freq"], string> = {
    DAILY: parsed.interval === 1 ? "Daily" : `Every ${parsed.interval} days`,
    WEEKLY: parsed.interval === 1 ? "Weekly" : `Every ${parsed.interval} weeks`,
    MONTHLY: parsed.interval === 1 ? "Monthly" : `Every ${parsed.interval} months`,
    YEARLY: parsed.interval === 1 ? "Annually" : `Every ${parsed.interval} years`,
  };
  const parts = [freqMap[parsed.freq]];
  if (parsed.byDay && parsed.byDay.length > 0) {
    parts.push(`on ${parsed.byDay.map((d) => WEEKDAY_TO_BYDAY[d]).join(", ")}`);
  }
  if (parsed.untilIsoDate) {
    parts.push(`until ${parsed.untilIsoDate}`);
  } else if (parsed.count) {
    parts.push(`(${parsed.count} occurrences)`);
  }
  return parts.join(" ");
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Expands a single CetlsEvent into one or more occurrences within [rangeFromIso, rangeToIso].
 * Non-recurring events return a single occurrence if they overlap the range.
 */
export function expandEventOccurrences(
  event: CetlsEvent,
  rangeFromDate?: string, // YYYY-MM-DD
  rangeToDate?: string, // YYYY-MM-DD
): ExpandedEventOccurrence[] {
  const startParts = getIstParts(event.start);
  const startMs = toEpochMs(event.start, false);
  const endMs = toEpochMs(event.end, event.allDay);
  const durationMs = Math.max(0, endMs - startMs);

  const windowFrom = rangeFromDate?.slice(0, 10) ?? "1970-01-01";
  const windowTo = rangeToDate?.slice(0, 10) ?? "2099-12-31";

  const rruleStr = event.recurrence?.rrule?.trim();
  const parsed = rruleStr ? parseRRule(rruleStr) : null;

  if (!parsed) {
    const endParts = getIstParts(event.end);
    if (endParts.isoDate < windowFrom || startParts.isoDate > windowTo) {
      return [];
    }
    return [
      {
        ...event,
        occurrenceKey: `${event.id}:${startParts.isoDate}`,
        occurrenceDate: startParts.isoDate,
        occurrenceStart: normalizeIstIso(event.start, false),
        occurrenceEnd: normalizeIstIso(event.end, event.allDay),
        isRecurringInstance: false,
      },
    ];
  }

  const exdatesSet = new Set(
    (event.recurrence?.exdates ?? []).map((d) => d.trim().slice(0, 10)),
  );

  const startTimeSuffix = normalizeIstIso(event.start, false).slice(10); // T10:00:00+05:30
  const baseUtcDate = new Date(
    Date.UTC(startParts.year, startParts.month - 1, startParts.day),
  );
  const maxHardDate =
    windowTo < "2030-12-31" ? windowTo : "2028-12-31";
  const effectiveUntil =
    parsed.untilIsoDate && parsed.untilIsoDate < maxHardDate
      ? parsed.untilIsoDate
      : maxHardDate;

  const occurrences: ExpandedEventOccurrence[] = [];
  let generatedCount = 0;
  const maxIterations = 750;

  let cursor = new Date(baseUtcDate.getTime());
  for (let step = 0; step < maxIterations; step += 1) {
    const candDateStr = formatUtcIsoDate(cursor);
    if (candDateStr > effectiveUntil) break;
    if (parsed.count && generatedCount >= parsed.count) break;

    const candYear = cursor.getUTCFullYear();
    const candMonth = cursor.getUTCMonth() + 1;
    const candDay = cursor.getUTCDate();
    const candWeekday = cursor.getUTCDay();

    let matches = false;
    const daysSinceStart = Math.round(
      (cursor.getTime() - baseUtcDate.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (parsed.freq === "DAILY") {
      matches = daysSinceStart % parsed.interval === 0;
    } else if (parsed.freq === "WEEKLY") {
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      const allowedDays =
        parsed.byDay && parsed.byDay.length > 0
          ? parsed.byDay
          : [startParts.weekday];
      matches =
        weeksSinceStart % parsed.interval === 0 &&
        allowedDays.includes(candWeekday);
    } else if (parsed.freq === "MONTHLY") {
      const monthsSinceStart =
        (candYear - startParts.year) * 12 + (candMonth - startParts.month);
      const allowedMonthDays =
        parsed.byMonthDay && parsed.byMonthDay.length > 0
          ? parsed.byMonthDay
          : [startParts.day];
      matches =
        monthsSinceStart >= 0 &&
        monthsSinceStart % parsed.interval === 0 &&
        allowedMonthDays.includes(candDay);
    } else if (parsed.freq === "YEARLY") {
      const yearsSinceStart = candYear - startParts.year;
      matches =
        yearsSinceStart >= 0 &&
        yearsSinceStart % parsed.interval === 0 &&
        candMonth === startParts.month &&
        candDay === startParts.day;
    }

    if (matches) {
      generatedCount += 1;
      if (!exdatesSet.has(candDateStr)) {
        const occStartIso = `${candDateStr}${startTimeSuffix}`;
        const occStartMs = new Date(occStartIso).getTime();
        const occEndIso = normalizeIstIso(
          new Date(occStartMs + durationMs).toISOString(),
        );
        const occEndDate = getIstParts(occEndIso).isoDate;

        if (occEndDate >= windowFrom && candDateStr <= windowTo) {
          occurrences.push({
            ...event,
            occurrenceKey: `${event.id}:${candDateStr}`,
            occurrenceDate: candDateStr,
            occurrenceStart: occStartIso,
            occurrenceEnd: occEndIso,
            isRecurringInstance: true,
          });
        }
      }
    }

    cursor = addUtcDays(cursor, 1);
  }

  return occurrences;
}
