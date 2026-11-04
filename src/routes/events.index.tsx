import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import {
  AccessBadge,
  CategoryBadge,
  EventStatusBadge,
  ModeBadge,
  SeriesBadge,
} from "@/components/events/event-badges";
import { EventCard } from "@/components/events/event-card";
import { SiteShell } from "@/components/site-shell";
import { getPublicEventsFn } from "@/lib/events/events-api";
import {
  formatFullDateIst,
  formatMonthYear,
  formatTime12hIst,
  getIstParts,
  todayIstDate,
  toEpochMs,
} from "@/lib/events/ist-date";
import { expandEventOccurrences } from "@/lib/events/recurrence";
import { getSeedEvents } from "@/lib/events/seed-data";
import {
  CATEGORY_LABELS,
  DOMAIN_LABELS,
  EVENT_CATEGORIES,
  EVENT_DOMAINS,
  EVENT_MODES,
  MODE_LABELS,
  PUBLIC_EVENT_STATUSES,
  formatSeriesLabel,
  formatVenueDisplay,
  isFieldPending,
  normalizeDomainSlug,
  type CetlsEvent,
  type EventCategory,
  type EventDomain,
  type EventMode,
  type ExpandedEventOccurrence,
} from "@/lib/events/types";
import { pageMetadata } from "@/lib/seo";
import { data, t } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export type CalendarViewMode = "month" | "quarter" | "year" | "list" | "agenda";

export interface EventsSearchSchema {
  view?: CalendarViewMode;
  month?: string; // YYYY-MM
  category?: string;
  domain?: string;
  city?: string;
  mode?: string;
  series?: string;
}

export const Route = createFileRoute("/events/")({
  validateSearch: (search: Record<string, unknown>): EventsSearchSchema => {
    const viewRaw = typeof search.view === "string" ? search.view : undefined;
    const view: CalendarViewMode | undefined =
      viewRaw === "month" ||
      viewRaw === "quarter" ||
      viewRaw === "year" ||
      viewRaw === "list" ||
      viewRaw === "agenda"
        ? viewRaw
        : undefined;
    const month =
      typeof search.month === "string" && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : undefined;
    const category =
      typeof search.category === "string" && search.category
        ? search.category
        : undefined;
    const domain =
      typeof search.domain === "string" && search.domain
        ? search.domain
        : undefined;
    const city =
      typeof search.city === "string" && search.city ? search.city : undefined;
    const mode =
      typeof search.mode === "string" && search.mode ? search.mode : undefined;
    const series =
      typeof search.series === "string" && search.series
        ? search.series
        : undefined;

    return {
      ...(view ? { view } : {}),
      ...(month ? { month } : {}),
      ...(category ? { category } : {}),
      ...(domain ? { domain } : {}),
      ...(city ? { city } : {}),
      ...(mode ? { mode } : {}),
      ...(series ? { series } : {}),
    };
  },
  head: () => pageMetadata("events"),
  loader: async () => {
    try {
      return await getPublicEventsFn({ data: {} });
    } catch {
      const seed = getSeedEvents();
      return {
        events: seed,
        occurrences: [],
        cities: ["Hyderabad", "New Delhi"],
        seriesTags: ["eksaq-partnership"],
        timezone: "Asia/Kolkata",
        source: "snapshot-fallback" as const,
      };
    }
  },
  component: EventsCalendarPage,
});

interface CalendarCell {
  isoDate: string; // YYYY-MM-DD
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  occurrences: ExpandedEventOccurrence[];
}

function buildMonthGrid(
  year: number,
  month: number, // 1..12
  todayIso: string,
  occurrencesByDate: Map<string, ExpandedEventOccurrence[]>,
): CalendarCell[][] {
  const firstDayUtc = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstDayUtc.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const gridStartUtc = new Date(Date.UTC(year, month - 1, 1 - startWeekday));

  const weeks: CalendarCell[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const row: CalendarCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const cellDate = new Date(
        gridStartUtc.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000,
      );
      const cYear = cellDate.getUTCFullYear();
      const cMonth = cellDate.getUTCMonth() + 1;
      const cDay = cellDate.getUTCDate();
      const isoDate = `${cYear}-${String(cMonth).padStart(2, "0")}-${String(cDay).padStart(2, "0")}`;
      row.push({
        isoDate,
        day: cDay,
        inCurrentMonth: cYear === year && cMonth === month,
        isToday: isoDate === todayIso,
        occurrences: occurrencesByDate.get(isoDate) ?? [],
      });
    }
    if (w < 5 || row.some((c) => c.inCurrentMonth)) {
      weeks.push(row);
    }
  }
  return weeks;
}

function shiftYearMonth(
  year: number,
  month: number,
  deltaMonths: number,
): { year: number; month: number; ym: string } {
  const d = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return {
    year: y,
    month: m,
    ym: `${y}-${String(m).padStart(2, "0")}`,
  };
}

function shiftIsoDateDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const QUARTER_RANGE_LABELS: Record<number, string> = {
  1: "Jan – Mar",
  2: "Apr – Jun",
  3: "Jul – Sep",
  4: "Oct – Dec",
};

function getQuarterFromMonth(month: number): 1 | 2 | 3 | 4 {
  return (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}

function getQuarterMonths(quarter: 1 | 2 | 3 | 4): [number, number, number] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

function formatQuarterHeading(year: number, quarter: 1 | 2 | 3 | 4): string {
  return `Q${quarter} ${year} (${QUARTER_RANGE_LABELS[quarter]})`;
}

interface MiniMonthCardProps {
  year: number;
  month: number;
  todayIso: string;
  occurrencesByDate: Map<string, ExpandedEventOccurrence[]>;
  monthOccurrences: ExpandedEventOccurrence[];
  onSelectMonth: (ym: string) => void;
  onSelectDate: (isoDate: string, ym: string) => void;
  detailed?: boolean;
}

function MiniMonthCard({
  year,
  month,
  todayIso,
  occurrencesByDate,
  monthOccurrences,
  onSelectMonth,
  onSelectDate,
  detailed = false,
}: MiniMonthCardProps) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const weeks = useMemo(
    () => buildMonthGrid(year, month, todayIso, occurrencesByDate),
    [year, month, todayIso, occurrencesByDate],
  );
  const quarter = getQuarterFromMonth(month);
  const hasTentative = monthOccurrences.some((o) => o.status === "pending");
  const hasConfirmed = monthOccurrences.some((o) => o.status === "published");

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border bg-surface p-4 shadow-2xs transition-colors",
        monthOccurrences.length > 0
          ? hasTentative && !hasConfirmed
            ? "border-2 border-dashed border-accent/70"
            : "border-primary/35"
          : "border-border",
      )}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-accent uppercase">
              Q{quarter} · {year}
            </span>
            <h3 className="font-display text-base font-semibold text-fg">
              {formatMonthYear(year, month)}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {monthOccurrences.length > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  hasTentative && !hasConfirmed
                    ? "border border-dashed border-accent bg-accent/15 text-fg"
                    : "bg-primary/12 text-primary",
                )}
              >
                {hasTentative && !hasConfirmed && (
                  <PencilLine className="size-2.5 text-accent" aria-hidden="true" />
                )}
                {monthOccurrences.length}{" "}
                {monthOccurrences.length === 1 ? "event" : "events"}
              </span>
            )}
            <button
              type="button"
              onClick={() => onSelectMonth(ym)}
              aria-label={`Open Month view for ${formatMonthYear(year, month)}`}
              className="inline-flex min-h-8 items-center rounded-lg border border-border bg-bg px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:border-primary"
            >
              Month →
            </button>
          </div>
        </div>

        {/* Mini 7-column calendar table */}
        <table
          aria-label={formatMonthYear(year, month)}
          className="mt-2.5 w-full border-collapse text-center text-xs"
        >
          <thead>
            <tr className="text-[10px] font-semibold text-muted uppercase">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <th key={d} scope="col" className="py-1 font-semibold">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wIdx) => (
              <tr key={wIdx}>
                {week.map((cell) => {
                  const hasOcc = cell.inCurrentMonth && cell.occurrences.length > 0;
                  const isTentativeDay =
                    hasOcc && cell.occurrences.every((o) => o.status === "pending");
                  const isConfirmedDay =
                    hasOcc && cell.occurrences.some((o) => o.status === "published");
                  const titleText = hasOcc
                    ? `${formatFullDateIst(cell.isoDate)}: ${cell.occurrences
                        .map(
                          (o) =>
                            `${o.status === "pending" ? "[Tentative] " : ""}${o.title}`,
                        )
                        .join(", ")}`
                    : formatFullDateIst(cell.isoDate);

                  return (
                    <td key={cell.isoDate} className="p-0.5">
                      {cell.inCurrentMonth ? (
                        <button
                          type="button"
                          title={titleText}
                          aria-label={titleText}
                          onClick={() => onSelectDate(cell.isoDate, ym)}
                          className={cn(
                            "relative inline-flex size-7 items-center justify-center rounded-md text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                            isConfirmedDay
                              ? "border border-primary bg-primary text-primary-fg font-bold shadow-2xs"
                              : isTentativeDay
                                ? "border-2 border-dashed border-accent bg-accent/15 font-bold text-fg"
                                : cell.isToday
                                  ? "border border-primary font-semibold text-primary"
                                  : "text-fg hover:bg-soft",
                          )}
                        >
                          <span>{cell.day}</span>
                        </button>
                      ) : (
                        <span className="inline-flex size-7 items-center justify-center text-[11px] text-muted/35">
                          {cell.day}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Events list inside this month card */}
      <div className="mt-3 border-t border-border pt-2.5">
        {monthOccurrences.length === 0 ? (
          <p className="text-xs text-muted">No scheduled events</p>
        ) : (
          <div className="space-y-2">
            {monthOccurrences.map((occ) => {
              const isPending = occ.status === "pending";
              const dayNum = getIstParts(occ.occurrenceStart).day;
              return (
                <Link
                  key={occ.occurrenceKey}
                  to="/events/$slug"
                  params={{ slug: occ.slug }}
                  className={cn(
                    "block rounded-xl p-2 text-left text-xs transition-colors",
                    isPending
                      ? "border-2 border-dashed border-accent/80 bg-accent/10 text-fg hover:bg-accent/15"
                      : "border border-primary/25 bg-primary/8 text-fg hover:border-primary",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-primary">
                      {dayNum} {formatMonthYear(year, month).split(" ")[0].slice(0, 3)}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {isPending && (
                        <span className="inline-flex items-center gap-0.5 rounded-xs bg-accent/20 px-1.5 py-0.2 text-[10px] font-bold text-accent uppercase">
                          <PencilLine className="size-2.5" aria-hidden="true" />
                          Tentative
                        </span>
                      )}
                      <span className="rounded-xs bg-surface px-1.5 py-0.2 text-[10px] font-semibold text-muted">
                        {CATEGORY_LABELS[occ.category]}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 font-semibold text-fg line-clamp-2">
                    {occ.title}
                  </p>
                  {detailed && (
                    <p className="mt-1 text-[11px] text-muted">
                      {formatVenueDisplay(occ)}
                      {occ.venue?.city ? ` · ${occ.venue.city}` : ""}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EventsCalendarPage() {
  const loaderData = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const todayIso = useMemo(() => todayIstDate(), []);
  const defaultYm = todayIso.slice(0, 7);

  // Mobile defaults to List view per Section 2 & 7; desktop defaults to List or Month if chosen
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobileViewport(mq.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const activeView: CalendarViewMode =
    search.view ?? (isMobileViewport ? "list" : "month");

  const activeYm = search.month ?? defaultYm;
  const [activeYear, activeMonth] = useMemo(() => {
    const [yStr, mStr] = activeYm.split("-");
    const y = Number(yStr) || 2026;
    const m = Math.min(12, Math.max(1, Number(mStr) || 11));
    return [y, m];
  }, [activeYm]);

  const [focusedDate, setFocusedDate] = useState<string>(() => {
    return todayIso.startsWith(activeYm) ? todayIso : `${activeYm}-01`;
  });

  useEffect(() => {
    setFocusedDate((prev) =>
      prev.startsWith(activeYm)
        ? prev
        : todayIso.startsWith(activeYm)
          ? todayIso
          : `${activeYm}-01`,
    );
  }, [activeYm, todayIso]);

  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Apply URL filters to all public events and expand occurrences across coverage window
  const { filteredOccurrences, pastOccurrences, allCities, allSeries } =
    useMemo(() => {
      const rawEvents: CetlsEvent[] = (loaderData.events ?? []).filter(
        (ev) => !ev.deleted && PUBLIC_EVENT_STATUSES.includes(ev.status),
      );

      const citiesSet = new Set<string>();
      const seriesSet = new Set<string>(["eksaq-partnership"]);
      for (const ev of rawEvents) {
        if (ev.venue?.city?.trim()) citiesSet.add(ev.venue.city.trim());
        for (const s of ev.series ?? []) {
          if (s.trim()) seriesSet.add(s.trim());
        }
      }

      const catFilter = search.category?.toLowerCase();
      const domFilter = search.domain ? normalizeDomainSlug(search.domain) : null;
      const cityFilter = search.city?.toLowerCase();
      const modeFilter = search.mode?.toLowerCase();
      const seriesFilter = search.series?.toLowerCase();

      const matched = rawEvents.filter((ev) => {
        if (catFilter && catFilter !== "all" && ev.category !== catFilter) {
          return false;
        }
        if (domFilter && !ev.domains.includes(domFilter)) {
          return false;
        }
        if (
          cityFilter &&
          cityFilter !== "all" &&
          (ev.venue?.city?.trim().toLowerCase() ?? "") !== cityFilter
        ) {
          return false;
        }
        if (modeFilter && modeFilter !== "all" && ev.mode !== modeFilter) {
          return false;
        }
        if (
          seriesFilter &&
          seriesFilter !== "all" &&
          !ev.series.map((s) => s.toLowerCase()).includes(seriesFilter)
        ) {
          return false;
        }
        return true;
      });

      const expanded: ExpandedEventOccurrence[] = [];
      for (const ev of matched) {
        expanded.push(...expandEventOccurrences(ev, "2026-01-01", "2028-12-31"));
      }
      expanded.sort(
        (a, b) =>
          toEpochMs(a.occurrenceStart, false) -
          toEpochMs(b.occurrenceStart, false),
      );

      const past = expanded
        .filter((occ) => occ.occurrenceDate < todayIso)
        .sort(
          (a, b) =>
            toEpochMs(b.occurrenceStart, false) -
            toEpochMs(a.occurrenceStart, false),
        );

      return {
        filteredOccurrences: expanded,
        pastOccurrences: past,
        allCities: Array.from(citiesSet).sort(),
        allSeries: Array.from(seriesSet).sort(),
      };
    }, [
      loaderData.events,
      search.category,
      search.domain,
      search.city,
      search.mode,
      search.series,
      todayIso,
    ]);

  const occurrencesByDate = useMemo(() => {
    const map = new Map<string, ExpandedEventOccurrence[]>();
    for (const occ of filteredOccurrences) {
      const list = map.get(occ.occurrenceDate) ?? [];
      list.push(occ);
      map.set(occ.occurrenceDate, list);
    }
    return map;
  }, [filteredOccurrences]);

  const monthWeeks = useMemo(
    () => buildMonthGrid(activeYear, activeMonth, todayIso, occurrencesByDate),
    [activeYear, activeMonth, todayIso, occurrencesByDate],
  );

  const monthOccurrences = useMemo(
    () =>
      filteredOccurrences.filter((occ) =>
        occ.occurrenceDate.startsWith(activeYm),
      ),
    [filteredOccurrences, activeYm],
  );

  const selectedDayOccurrences = useMemo(
    () => occurrencesByDate.get(focusedDate) ?? [],
    [occurrencesByDate, focusedDate],
  );

  const occurrencesByYm = useMemo(() => {
    const map = new Map<string, ExpandedEventOccurrence[]>();
    for (const occ of filteredOccurrences) {
      const ym = occ.occurrenceDate.slice(0, 7);
      const list = map.get(ym) ?? [];
      list.push(occ);
      map.set(ym, list);
    }
    return map;
  }, [filteredOccurrences]);

  const activeQuarter = useMemo(
    () => getQuarterFromMonth(activeMonth),
    [activeMonth],
  );

  const quarterMonths = useMemo(
    () => getQuarterMonths(activeQuarter),
    [activeQuarter],
  );

  const quarterOccurrences = useMemo(() => {
    const allowedYms = new Set(
      quarterMonths.map((m) => `${activeYear}-${String(m).padStart(2, "0")}`),
    );
    return filteredOccurrences.filter((occ) =>
      allowedYms.has(occ.occurrenceDate.slice(0, 7)),
    );
  }, [filteredOccurrences, quarterMonths, activeYear]);

  const yearOccurrences = useMemo(
    () =>
      filteredOccurrences.filter((occ) =>
        occ.occurrenceDate.startsWith(`${activeYear}-`),
      ),
    [filteredOccurrences, activeYear],
  );

  function updateSearch(patch: Partial<EventsSearchSchema>) {
    const next: EventsSearchSchema = {
      ...search,
      ...patch,
    };
    (Object.keys(next) as Array<keyof EventsSearchSchema>).forEach((k) => {
      if (!next[k] || next[k] === "all") {
        delete next[k];
      }
    });
    void navigate({ search: next, replace: true });
  }

  function resetAllFilters() {
    void navigate({
      search: search.view ? { view: search.view } : {},
      replace: true,
    });
  }

  function handlePeriodStep(direction: -1 | 1) {
    const deltaMonths =
      activeView === "year" ? direction * 12 : activeView === "quarter" ? direction * 3 : direction;
    const next = shiftYearMonth(activeYear, activeMonth, deltaMonths);
    updateSearch({ month: next.ym });
  }

  function handleJumpToToday() {
    setFocusedDate(todayIso);
    updateSearch({ month: todayIso.slice(0, 7) });
  }

  function handleGridKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    isoDate: string,
  ) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    let targetDate: string | null = null;
    if (e.key === "ArrowRight") {
      targetDate = shiftIsoDateDays(isoDate, 1);
    } else if (e.key === "ArrowLeft") {
      targetDate = shiftIsoDateDays(isoDate, -1);
    } else if (e.key === "ArrowDown") {
      targetDate = shiftIsoDateDays(isoDate, 7);
    } else if (e.key === "ArrowUp") {
      targetDate = shiftIsoDateDays(isoDate, -7);
    } else if (e.key === "Home") {
      const p = getIstParts(isoDate);
      targetDate = shiftIsoDateDays(isoDate, -p.weekday);
    } else if (e.key === "End") {
      const p = getIstParts(isoDate);
      targetDate = shiftIsoDateDays(isoDate, 6 - p.weekday);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      const prev = shiftYearMonth(activeYear, activeMonth, -1);
      updateSearch({ month: prev.ym });
      return;
    } else if (e.key === "PageDown") {
      e.preventDefault();
      const next = shiftYearMonth(activeYear, activeMonth, 1);
      updateSearch({ month: next.ym });
      return;
    }

    if (targetDate) {
      e.preventDefault();
      setFocusedDate(targetDate);
      const targetYm = targetDate.slice(0, 7);
      if (targetYm !== activeYm) {
        updateSearch({ month: targetYm });
      }
      requestAnimationFrame(() => {
        const btn = cellRefs.current.get(targetDate!);
        if (btn) {
          btn.focus();
          btn.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      });
    }
  }

  const hasActiveFilters = Boolean(
    search.category ||
      search.domain ||
      search.city ||
      search.mode ||
      search.series,
  );

  // Group occurrences by month for Agenda view
  const agendaGroups = useMemo(() => {
    const groups: Array<{
      ym: string;
      label: string;
      items: ExpandedEventOccurrence[];
    }> = [];
    const byYm = new Map<string, ExpandedEventOccurrence[]>();
    for (const occ of filteredOccurrences) {
      const ym = occ.occurrenceDate.slice(0, 7);
      const list = byYm.get(ym) ?? [];
      list.push(occ);
      byYm.set(ym, list);
    }
    for (const [ym, items] of byYm.entries()) {
      const [y, m] = ym.split("-").map(Number);
      groups.push({
        ym,
        label: formatMonthYear(y, m),
        items,
      });
    }
    return groups;
  }, [filteredOccurrences]);

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        {/* Page Header */}
        <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">
              {data.org.shortName} · {t(data.org.parent.shortName)} · Asia/Kolkata (IST)
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Events Calendar
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
              Public calendar of roundtables, workshops, talks, launches, and advisory
              convenings across K-12, Higher Education, Professionals &amp; Executives,
              and Third-Age Learning. All times are shown in Indian Standard Time (IST,
              UTC+05:30).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/events.ics"
              download="cetls-events.ics"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-fg transition-colors hover:border-primary hover:text-primary"
            >
              <Download className="size-4 text-primary" aria-hidden="true" />
              <span>Export Calendar (.ics)</span>
            </a>
          </div>
        </div>

        {/* View Switcher & Period Navigation */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label="Calendar view mode"
            className="inline-flex flex-wrap rounded-xl border border-border bg-bg p-1"
          >
            <button
              type="button"
              aria-pressed={activeView === "month"}
              onClick={() => updateSearch({ view: "month" })}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                activeView === "month"
                  ? "bg-primary text-primary-fg shadow-xs"
                  : "text-fg hover:text-primary",
              )}
            >
              <LayoutGrid className="size-3.5" aria-hidden="true" />
              <span>Month</span>
            </button>
            <button
              type="button"
              aria-pressed={activeView === "quarter"}
              onClick={() => updateSearch({ view: "quarter" })}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                activeView === "quarter"
                  ? "bg-primary text-primary-fg shadow-xs"
                  : "text-fg hover:text-primary",
              )}
            >
              <CalendarRange className="size-3.5" aria-hidden="true" />
              <span>Quarter</span>
            </button>
            <button
              type="button"
              aria-pressed={activeView === "year"}
              onClick={() => updateSearch({ view: "year" })}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                activeView === "year"
                  ? "bg-primary text-primary-fg shadow-xs"
                  : "text-fg hover:text-primary",
              )}
            >
              <CalendarDays className="size-3.5" aria-hidden="true" />
              <span>Annual</span>
            </button>
            <button
              type="button"
              aria-pressed={activeView === "list"}
              onClick={() => updateSearch({ view: "list" })}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                activeView === "list"
                  ? "bg-primary text-primary-fg shadow-xs"
                  : "text-fg hover:text-primary",
              )}
            >
              <List className="size-3.5" aria-hidden="true" />
              <span>List</span>
            </button>
            <button
              type="button"
              aria-pressed={activeView === "agenda"}
              onClick={() => updateSearch({ view: "agenda" })}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                activeView === "agenda"
                  ? "bg-primary text-primary-fg shadow-xs"
                  : "text-fg hover:text-primary",
              )}
            >
              <CalendarIcon className="size-3.5" aria-hidden="true" />
              <span>Agenda</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePeriodStep(-1)}
              aria-label={
                activeView === "year"
                  ? "Previous year"
                  : activeView === "quarter"
                    ? "Previous quarter"
                    : "Previous month"
              }
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="ml-1 hidden sm:inline">Prev</span>
            </button>

            <div
              aria-live="polite"
              className="min-w-48 text-center font-display text-lg font-semibold text-fg"
            >
              {activeView === "year"
                ? `${activeYear} Annual Calendar`
                : activeView === "quarter"
                  ? formatQuarterHeading(activeYear, activeQuarter)
                  : formatMonthYear(activeYear, activeMonth)}
            </div>

            <button
              type="button"
              onClick={() => handlePeriodStep(1)}
              aria-label={
                activeView === "year"
                  ? "Next year"
                  : activeView === "quarter"
                    ? "Next quarter"
                    : "Next month"
              }
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg transition-colors hover:border-primary hover:text-primary"
            >
              <span className="mr-1 hidden sm:inline">Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleJumpToToday}
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary"
            >
              Today
            </button>

            {activeView === "quarter" ? (
              <div className="ml-auto flex items-center gap-1 text-xs">
                {([1, 2, 3, 4] as const).map((q) => {
                  const qStartMonth = (q - 1) * 3 + 1;
                  const qYm = `${activeYear}-${String(qStartMonth).padStart(2, "0")}`;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => updateSearch({ month: qYm })}
                      className={cn(
                        "min-h-11 rounded-lg border px-2.5 py-1.5 font-semibold transition-colors",
                        activeQuarter === q
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-bg text-muted hover:text-fg",
                      )}
                    >
                      Q{q}
                    </button>
                  );
                })}
              </div>
            ) : activeView === "year" ? (
              <div className="ml-auto flex items-center gap-1.5 text-xs">
                {[2026, 2027].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() =>
                      updateSearch({
                        month: `${yr}-${String(activeMonth).padStart(2, "0")}`,
                      })
                    }
                    className={cn(
                      "min-h-11 rounded-lg border px-2.5 py-1.5 font-semibold transition-colors",
                      activeYear === yr
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-bg text-muted hover:text-fg",
                    )}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => updateSearch({ month: "2026-09" })}
                  className={cn(
                    "min-h-11 rounded-lg border px-2.5 py-1.5 font-medium transition-colors",
                    activeYm === "2026-09"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-bg text-muted hover:text-fg",
                  )}
                >
                  Sep 2026
                </button>
                <button
                  type="button"
                  onClick={() => updateSearch({ month: "2026-11" })}
                  className={cn(
                    "min-h-11 rounded-lg border px-2.5 py-1.5 font-medium transition-colors",
                    activeYm === "2026-11"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-bg text-muted hover:text-fg",
                  )}
                >
                  Nov 2026
                </button>
              </div>
            )}
          </div>
        </div>

        {/* URL-Synced Filter Bar */}
        <section
          aria-label="Filter events"
          className="mt-4 rounded-2xl border border-border bg-surface p-4 sm:p-5"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
              <Filter className="size-3.5 text-accent" aria-hidden="true" />
              <span>Filter Calendar (synced to URL)</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-accent hover:border-accent"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>Clear all filters</span>
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label
                htmlFor="filter-category"
                className="block text-xs font-semibold text-fg"
              >
                Category
              </label>
              <select
                id="filter-category"
                value={search.category ?? "all"}
                onChange={(e) =>
                  updateSearch({ category: e.target.value || undefined })
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg focus:border-primary focus:outline-none"
              >
                <option value="all">All categories</option>
                {EVENT_CATEGORIES.map((cat: EventCategory) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-series"
                className="block text-xs font-semibold text-fg"
              >
                Series / Initiative
              </label>
              <select
                id="filter-series"
                value={search.series ?? "all"}
                onChange={(e) =>
                  updateSearch({ series: e.target.value || undefined })
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg focus:border-primary focus:outline-none"
              >
                <option value="all">All series</option>
                {allSeries.map((s) => (
                  <option key={s} value={s}>
                    {formatSeriesLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-domain"
                className="block text-xs font-semibold text-fg"
              >
                Domain
              </label>
              <select
                id="filter-domain"
                value={search.domain ?? "all"}
                onChange={(e) =>
                  updateSearch({ domain: e.target.value || undefined })
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg focus:border-primary focus:outline-none"
              >
                <option value="all">All domains</option>
                {EVENT_DOMAINS.map((dom: EventDomain) => (
                  <option key={dom} value={dom}>
                    {DOMAIN_LABELS[dom]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-city"
                className="block text-xs font-semibold text-fg"
              >
                City
              </label>
              <select
                id="filter-city"
                value={search.city ?? "all"}
                onChange={(e) =>
                  updateSearch({ city: e.target.value || undefined })
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg focus:border-primary focus:outline-none"
              >
                <option value="all">All cities</option>
                {allCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-mode"
                className="block text-xs font-semibold text-fg"
              >
                Attendance Mode
              </label>
              <select
                id="filter-mode"
                value={search.mode ?? "all"}
                onChange={(e) =>
                  updateSearch({ mode: e.target.value || undefined })
                }
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg focus:border-primary focus:outline-none"
              >
                <option value="all">All modes</option>
                {EVENT_MODES.map((m: EventMode) => (
                  <option key={m} value={m}>
                    {MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Legend for Confirmed vs Tentative (C4) */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted">
            <span className="font-semibold text-fg">Legend:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-xs border border-primary bg-primary/15" />
              <span>Confirmed (Published)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-xs border-2 border-dashed border-accent bg-accent/10" />
              <PencilLine className="size-3 text-accent" aria-hidden="true" />
              <span>
                <strong>Tentative</strong> (Pencilled in — details to be confirmed)
              </span>
            </span>
          </div>
        </section>

        {/* MONTH VIEW (WCAG 2.1 AA ARIA Grid) */}
        {activeView === "month" && (
          <section className="mt-8" aria-label="Monthly calendar view">
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-2xs">
              <table
                role="grid"
                aria-label={`Events calendar for ${formatMonthYear(activeYear, activeMonth)}`}
                className="w-full min-w-[640px] border-collapse table-fixed"
              >
                <thead>
                  <tr className="border-b border-border bg-soft">
                    {[
                      { short: "Sun", full: "Sunday" },
                      { short: "Mon", full: "Monday" },
                      { short: "Tue", full: "Tuesday" },
                      { short: "Wed", full: "Wednesday" },
                      { short: "Thu", full: "Thursday" },
                      { short: "Fri", full: "Friday" },
                      { short: "Sat", full: "Saturday" },
                    ].map((d) => (
                      <th
                        key={d.short}
                        scope="col"
                        role="columnheader"
                        abbr={d.full}
                        className="py-3 text-center text-xs font-semibold tracking-wide text-fg uppercase"
                      >
                        {d.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthWeeks.map((week, wIdx) => (
                    <tr key={wIdx} className="border-b border-border last:border-b-0">
                      {week.map((cell) => {
                        const isSelected = cell.isoDate === focusedDate;
                        const cellAriaLabel = `${formatFullDateIst(cell.isoDate)}${
                          cell.occurrences.length > 0
                            ? `, ${cell.occurrences.length} event${cell.occurrences.length === 1 ? "" : "s"}`
                            : ", no events"
                        }`;
                        return (
                          <td
                            key={cell.isoDate}
                            role="gridcell"
                            aria-selected={isSelected}
                            className={cn(
                              "min-h-32 align-top border-r border-border p-2 transition-colors last:border-r-0",
                              !cell.inCurrentMonth && "bg-soft/45 text-muted",
                              cell.isToday && "bg-primary/5",
                              isSelected && "ring-2 ring-inset ring-primary",
                            )}
                          >
                            <button
                              ref={(el) => {
                                if (el) cellRefs.current.set(cell.isoDate, el);
                                else cellRefs.current.delete(cell.isoDate);
                              }}
                              type="button"
                              tabIndex={isSelected ? 0 : -1}
                              aria-label={cellAriaLabel}
                              onClick={() => setFocusedDate(cell.isoDate)}
                              onKeyDown={(e) => handleGridKeyDown(e, cell.isoDate)}
                              className={cn(
                                "inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                                cell.isToday
                                  ? "bg-primary text-primary-fg"
                                  : cell.inCurrentMonth
                                    ? "text-fg hover:bg-soft"
                                    : "text-muted hover:bg-soft",
                              )}
                            >
                              {cell.day}
                            </button>

                            {cell.occurrences.length > 0 && (
                              <div className="mt-1.5 space-y-1.5">
                                {cell.occurrences.map((occ) => {
                                  const isPending = occ.status === "pending";
                                  const isCancelled = occ.status === "cancelled";
                                  return (
                                    <Link
                                      key={occ.occurrenceKey}
                                      to="/events/$slug"
                                      params={{ slug: occ.slug }}
                                      className={cn(
                                        "block rounded-lg p-1.5 text-left text-xs leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                                        isPending
                                          ? "border-2 border-dashed border-accent bg-accent/10 text-fg hover:bg-accent/15"
                                          : isCancelled
                                            ? "border border-border bg-soft text-muted line-through"
                                            : "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
                                      )}
                                    >
                                      <div className="flex flex-wrap items-center gap-1">
                                        {isPending && (
                                          <span className="inline-flex items-center gap-0.5 rounded-xs bg-accent/20 px-1 py-0.2 text-[10px] font-bold text-accent uppercase">
                                            Tentative
                                          </span>
                                        )}
                                        {isCancelled && (
                                          <span className="inline-flex items-center rounded-xs bg-soft px-1 py-0.2 text-[10px] font-bold text-fg uppercase">
                                            Cancelled
                                          </span>
                                        )}
                                        <span className="text-[10px] font-semibold opacity-80">
                                          {CATEGORY_LABELS[occ.category]}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 font-semibold line-clamp-2">
                                        {occ.title}
                                      </p>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Day / Month Summary Panel below Grid */}
            <div className="mt-6">
              {selectedDayOccurrences.length > 0 ? (
                <div>
                  <h2 className="mb-4 font-display text-xl font-semibold">
                    Events on {formatFullDateIst(focusedDate)}
                  </h2>
                  <div className="grid gap-5">
                    {selectedDayOccurrences.map((occ) => (
                      <EventCard key={occ.occurrenceKey} event={occ} />
                    ))}
                  </div>
                </div>
              ) : monthOccurrences.length > 0 ? (
                <div>
                  <h2 className="mb-4 font-display text-xl font-semibold">
                    All Events in {formatMonthYear(activeYear, activeMonth)} (
                    {monthOccurrences.length})
                  </h2>
                  <div className="grid gap-5">
                    {monthOccurrences.map((occ) => (
                      <EventCard key={occ.occurrenceKey} event={occ} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                  <p className="text-sm text-muted">
                    No events scheduled in {formatMonthYear(activeYear, activeMonth)}{" "}
                    matching the active filters.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* QUARTERLY VIEW */}
        {activeView === "quarter" && (
          <section
            className="mt-8"
            aria-label={`Quarterly calendar view for ${formatQuarterHeading(activeYear, activeQuarter)}`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold text-fg">
                  {formatQuarterHeading(activeYear, activeQuarter)}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  3-month quarterly overview · Click any month’s “Month →” button or
                  highlighted date to drill into the full monthly grid.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg">
                {quarterOccurrences.length}{" "}
                {quarterOccurrences.length === 1 ? "event" : "events"} in Q
                {activeQuarter} {activeYear}
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {quarterMonths.map((m) => {
                const ym = `${activeYear}-${String(m).padStart(2, "0")}`;
                return (
                  <MiniMonthCard
                    key={ym}
                    year={activeYear}
                    month={m}
                    todayIso={todayIso}
                    occurrencesByDate={occurrencesByDate}
                    monthOccurrences={occurrencesByYm.get(ym) ?? []}
                    onSelectMonth={(targetYm) =>
                      updateSearch({ view: "month", month: targetYm })
                    }
                    onSelectDate={(isoDate, targetYm) => {
                      setFocusedDate(isoDate);
                      updateSearch({ view: "month", month: targetYm });
                    }}
                    detailed
                  />
                );
              })}
            </div>

            <div className="mt-8">
              <h3 className="mb-4 font-display text-xl font-semibold text-fg">
                Events in {formatQuarterHeading(activeYear, activeQuarter)} (
                {quarterOccurrences.length})
              </h3>
              {quarterOccurrences.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                  <p className="text-sm text-muted">
                    No events scheduled in{" "}
                    {formatQuarterHeading(activeYear, activeQuarter)} matching the
                    active filters.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {quarterOccurrences.map((occ) => (
                    <EventCard key={occ.occurrenceKey} event={occ} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ANNUAL / YEAR VIEW */}
        {activeView === "year" && (
          <section
            className="mt-8"
            aria-label={`Annual calendar view for ${activeYear}`}
          >
            {/* Annual Summary & Quarter Quick-Drill Bar */}
            <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-fg">
                    {activeYear} Annual Overview
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    12-month calendar across Q1–Q4 · Click any quarter card to open
                    its Quarterly view, or any month to open its Monthly view.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/12 px-3 py-1 font-semibold text-primary">
                    {
                      yearOccurrences.filter((o) => o.status === "published")
                        .length
                    }{" "}
                    Confirmed
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent bg-accent/12 px-3 py-1 font-semibold text-fg">
                    <PencilLine className="size-3 text-accent" aria-hidden="true" />
                    {
                      yearOccurrences.filter((o) => o.status === "pending")
                        .length
                    }{" "}
                    Tentative
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {([1, 2, 3, 4] as const).map((q) => {
                  const qMonths = getQuarterMonths(q);
                  const qStartYm = `${activeYear}-${String(qMonths[0]).padStart(2, "0")}`;
                  const qOccs = qMonths.flatMap(
                    (m) =>
                      occurrencesByYm.get(
                        `${activeYear}-${String(m).padStart(2, "0")}`,
                      ) ?? [],
                  );
                  const hasPending = qOccs.some((o) => o.status === "pending");

                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() =>
                        updateSearch({ view: "quarter", month: qStartYm })
                      }
                      className={cn(
                        "flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors hover:border-primary",
                        qOccs.length > 0
                          ? "border-primary/35 bg-bg"
                          : "border-border bg-bg/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-semibold text-fg">
                          Q{q} {activeYear}
                        </span>
                        <span className="text-[11px] font-medium text-muted">
                          {QUARTER_RANGE_LABELS[q]}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            qOccs.length > 0 ? "text-primary" : "text-muted",
                          )}
                        >
                          {qOccs.length} {qOccs.length === 1 ? "event" : "events"}
                        </span>
                        {hasPending && (
                          <span className="inline-flex items-center gap-0.5 rounded-xs border border-dashed border-accent bg-accent/15 px-1.5 py-0.2 text-[10px] font-bold text-accent uppercase">
                            Includes Tentative
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 12-Month Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => {
                const ym = `${activeYear}-${String(m).padStart(2, "0")}`;
                return (
                  <MiniMonthCard
                    key={ym}
                    year={activeYear}
                    month={m}
                    todayIso={todayIso}
                    occurrencesByDate={occurrencesByDate}
                    monthOccurrences={occurrencesByYm.get(ym) ?? []}
                    onSelectMonth={(targetYm) =>
                      updateSearch({ view: "month", month: targetYm })
                    }
                    onSelectDate={(isoDate, targetYm) => {
                      setFocusedDate(isoDate);
                      updateSearch({ view: "month", month: targetYm });
                    }}
                  />
                );
              })}
            </div>

            {/* Annual Event Cards below 12-month grid */}
            <div className="mt-10">
              <h3 className="mb-4 font-display text-xl font-semibold text-fg">
                All Scheduled &amp; Tentative Events in {activeYear} (
                {yearOccurrences.length})
              </h3>
              {yearOccurrences.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                  <p className="text-sm text-muted">
                    No events scheduled in {activeYear} matching the active filters.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {yearOccurrences.map((occ) => (
                    <EventCard key={occ.occurrenceKey} event={occ} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* LIST VIEW */}
        {activeView === "list" && (
          <section className="mt-8" aria-label="Events list view">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">
                All Matching Events ({filteredOccurrences.length})
              </h2>
            </div>
            {filteredOccurrences.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <p className="text-base font-medium text-fg">
                  No events match your current filter selection.
                </p>
                <p className="mt-1 text-sm text-muted">
                  Try clearing one or more filters to view the full CETLS calendar.
                </p>
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredOccurrences.map((occ) => (
                  <EventCard key={occ.occurrenceKey} event={occ} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* AGENDA VIEW */}
        {activeView === "agenda" && (
          <section className="mt-8" aria-label="Chronological agenda view">
            <h2 className="mb-6 font-display text-2xl font-semibold">
              Chronological Agenda (IST)
            </h2>
            {agendaGroups.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <p className="text-sm text-muted">
                  No events match your current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {agendaGroups.map((group) => (
                  <div
                    key={group.ym}
                    className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
                  >
                    <h3 className="border-b border-border pb-3 font-display text-xl font-semibold text-primary">
                      {group.label}
                    </h3>
                    <div className="divide-y divide-border">
                      {group.items.map((occ) => {
                        const s = getIstParts(occ.occurrenceStart);
                        const e = getIstParts(occ.occurrenceEnd);
                        const timePending =
                          isFieldPending(occ, "start time") ||
                          isFieldPending(occ, "end time");
                        const timeStr = timePending
                          ? "Time: To be confirmed (IST)"
                          : occ.allDay
                            ? "All day (IST)"
                            : `${formatTime12hIst(s.hour, s.minute)} – ${formatTime12hIst(e.hour, e.minute)} IST`;
                        const venueDisplay = formatVenueDisplay(occ);
                        const isPending = occ.status === "pending";

                        return (
                          <div
                            key={occ.occurrenceKey}
                            className={cn(
                              "flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between",
                              isPending &&
                                "my-2 rounded-xl border-2 border-dashed border-accent/60 bg-bg/60 p-4",
                            )}
                          >
                            <div className="sm:w-48 shrink-0">
                              <time
                                dateTime={occ.occurrenceStart}
                                className="block font-display text-base font-semibold text-fg"
                              >
                                {formatFullDateIst(occ.occurrenceStart)}
                              </time>
                              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                                <Clock className="size-3" aria-hidden="true" />
                                {timeStr}
                              </span>
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <CategoryBadge category={occ.category} />
                                <EventStatusBadge status={occ.status} />
                                <ModeBadge mode={occ.mode} />
                                <AccessBadge access={occ.access} />
                                {occ.series.map((tag) => (
                                  <SeriesBadge key={tag} series={tag} />
                                ))}
                              </div>
                              <h4 className="mt-2 font-display text-lg font-semibold">
                                <Link
                                  to="/events/$slug"
                                  params={{ slug: occ.slug }}
                                  className="hover:text-accent"
                                >
                                  {occ.title}
                                </Link>
                              </h4>
                              <p className="mt-1 text-sm text-muted">
                                {occ.summary}
                              </p>
                              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-fg">
                                <MapPin
                                  className="size-3.5 text-accent"
                                  aria-hidden="true"
                                />
                                <span>
                                  Venue: {venueDisplay}
                                  {occ.venue?.city ? ` · ${occ.venue.city}` : ""}
                                </span>
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Link
                                to="/events/$slug"
                                params={{ slug: occ.slug }}
                                className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3.5 py-2 text-xs font-semibold text-primary hover:border-primary"
                              >
                                Details
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Past Events Archive (Section 2 requirement) */}
        {pastOccurrences.length > 0 && (
          <section
            aria-labelledby="past-events-archive-heading"
            className="mt-14 border-t border-border pt-12"
          >
            <div className="mb-6">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
                <Archive className="size-3.5" aria-hidden="true" />
                <span>Archive</span>
              </p>
              <h2
                id="past-events-archive-heading"
                className="mt-1 font-display text-2xl font-semibold tracking-tight"
              >
                Past Events &amp; Reports
              </h2>
              <p className="mt-1 text-sm text-muted">
                Completed CETLS events remain archived with links to post-event reports,
                notes, and photo galleries where available.
              </p>
            </div>

            <div className="grid gap-5">
              {pastOccurrences.map((occ) => (
                <div
                  key={`archive-${occ.occurrenceKey}`}
                  className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={occ.category} />
                      <ModeBadge mode={occ.mode} />
                      <span className="text-xs font-medium text-muted">
                        {formatFullDateIst(occ.occurrenceStart)} · {occ.venue?.city}
                      </span>
                    </div>
                    <Link
                      to="/events/$slug"
                      params={{ slug: occ.slug }}
                      className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:text-accent"
                    >
                      View archived event →
                    </Link>
                  </div>

                  <h3 className="mt-2 font-display text-lg font-semibold">
                    <Link
                      to="/events/$slug"
                      params={{ slug: occ.slug }}
                      className="hover:text-accent"
                    >
                      {occ.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-muted">{occ.summary}</p>

                  {occ.links.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-border pt-3">
                      {occ.links.map((l) => (
                        <a
                          key={l.url}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary"
                        >
                          <span>{l.label}</span>
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </SiteShell>
  );
}
