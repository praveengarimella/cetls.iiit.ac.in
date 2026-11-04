import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays } from "lucide-react";
import { todayIstDate, toEpochMs } from "@/lib/events/ist-date";
import { expandEventOccurrences } from "@/lib/events/recurrence";
import type { CetlsEvent, ExpandedEventOccurrence } from "@/lib/events/types";
import { EventCard } from "./event-card";

export function selectNextUpcomingOccurrences(
  events: CetlsEvent[],
  referenceDateIst?: string,
  limit = 3,
): ExpandedEventOccurrence[] {
  const today = referenceDateIst ?? todayIstDate();
  const candidates = events.filter(
    (ev) => !ev.deleted && (ev.status === "published" || ev.status === "pending"),
  );

  const occurrences: ExpandedEventOccurrence[] = [];
  for (const ev of candidates) {
    occurrences.push(...expandEventOccurrences(ev, today, "2028-12-31"));
  }

  occurrences.sort(
    (a, b) =>
      toEpochMs(a.occurrenceStart, false) - toEpochMs(b.occurrenceStart, false),
  );

  return occurrences.slice(0, limit);
}

export function UpcomingEventsWidget({
  events,
}: {
  events: CetlsEvent[];
}) {
  const upcoming = selectNextUpcomingOccurrences(events, undefined, 3);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="home-upcoming-events-heading"
      className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <span>Upcoming Convenings · IST</span>
          </p>
          <h2
            id="home-upcoming-events-heading"
            className="font-display text-3xl font-semibold tracking-tight"
          >
            Upcoming Events
          </h2>
        </div>
        <Link
          to="/events"
          className="inline-flex min-h-11 items-center gap-1.5 font-medium text-accent hover:underline"
        >
          <span>View all events</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div
        className={
          upcoming.length === 1
            ? "grid gap-5"
            : upcoming.length === 2
              ? "grid gap-5 md:grid-cols-2"
              : "grid gap-5 lg:grid-cols-3"
        }
      >
        {upcoming.map((occ) => (
          <EventCard key={occ.occurrenceKey} event={occ} compact />
        ))}
      </div>
    </section>
  );
}
