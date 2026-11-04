import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarPlus,
  Clock,
  Download,
  MapPin,
  Repeat,
} from "lucide-react";
import { buildGoogleCalendarUrl } from "@/lib/events/ics";
import { formatEventDateTimeSummaryIst } from "@/lib/events/ist-date";
import { formatRRuleHumanReadable } from "@/lib/events/recurrence";
import {
  formatVenueDisplay,
  isFieldPending,
  type CetlsEvent,
  type ExpandedEventOccurrence,
} from "@/lib/events/types";
import { cn } from "@/lib/utils";
import {
  AccessBadge,
  CategoryBadge,
  DomainBadge,
  EventStatusBadge,
  ModeBadge,
  SeriesBadge,
} from "./event-badges";

export function EventCard({
  event,
  compact = false,
}: {
  event: CetlsEvent | ExpandedEventOccurrence;
  compact?: boolean;
}) {
  const occStart =
    "occurrenceStart" in event ? event.occurrenceStart : event.start;
  const occEnd = "occurrenceEnd" in event ? event.occurrenceEnd : event.end;
  const { dateLabel, timeLabel, ariaLabel } = formatEventDateTimeSummaryIst(
    event,
    occStart,
    occEnd,
  );
  const venueLabel = formatVenueDisplay(event);
  const venueIsPending = isFieldPending(event, "venue.name");
  const isPendingEvent = event.status === "pending";
  const isCancelled = event.status === "cancelled";
  const recurrenceLabel = formatRRuleHumanReadable(event.recurrence?.rrule);

  return (
    <article
      className={cn(
        "rounded-2xl p-5 transition-colors sm:p-6",
        isPendingEvent
          ? "border-2 border-dashed border-accent/60 bg-surface/85"
          : isCancelled
            ? "border border-border bg-soft/75 opacity-85"
            : "border border-border bg-surface hover:border-primary/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={event.category} />
        <EventStatusBadge status={event.status} />
        <ModeBadge mode={event.mode} />
        <AccessBadge access={event.access} />
        {event.series.map((tag) => (
          <SeriesBadge key={tag} series={tag} />
        ))}
        {recurrenceLabel && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-0.5 text-xs font-medium text-muted">
            <Repeat className="size-3 shrink-0" aria-hidden="true" />
            <span>{recurrenceLabel}</span>
          </span>
        )}
      </div>

      <h3
        className={cn(
          "mt-3 font-display text-xl font-semibold tracking-tight",
          isCancelled && "line-through text-muted",
        )}
      >
        <Link
          to="/events/$slug"
          params={{ slug: event.slug }}
          className="hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {event.title}
        </Link>
      </h3>

      {isCancelled && event.cancelReason && (
        <p className="mt-2 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg">
          Cancelled: {event.cancelReason}
        </p>
      )}

      <p className="mt-2 text-sm leading-relaxed text-muted">{event.summary}</p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2 text-fg">
          <Clock
            className="mt-0.5 size-4 shrink-0 text-accent"
            aria-hidden="true"
          />
          <div>
            <dt className="sr-only">Date and time (IST)</dt>
            <dd>
              <time dateTime={occStart} aria-label={ariaLabel} className="font-medium">
                {dateLabel}
              </time>
              <span className="block text-xs text-muted">{timeLabel}</span>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2 text-fg">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-accent"
            aria-hidden="true"
          />
          <div>
            <dt className="sr-only">Venue and city</dt>
            <dd>
              <span className={cn("font-medium", venueIsPending && "text-accent")}>
                Venue: {venueLabel}
              </span>
              {event.venue?.city && (
                <span className="block text-xs text-muted">
                  City: {event.venue.city}
                </span>
              )}
            </dd>
          </div>
        </div>
      </dl>

      {!compact && (event.domains.length > 0 || event.partners.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3">
          {event.domains.map((dom) => (
            <DomainBadge key={dom} domain={dom} />
          ))}
          {event.partners.length > 0 && (
            <span className="ml-auto text-xs font-medium text-muted">
              Partners: {event.partners.join(", ")}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Link
          to="/events/$slug"
          params={{ slug: event.slug }}
          aria-label={`View details for ${event.title}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent"
        >
          <span>Event details</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>

        {!isCancelled && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/events/${event.slug}.ics`}
              download={`${event.slug}.ics`}
              aria-label={`Download iCalendar (.ics) file for ${event.title}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg transition-colors hover:border-primary hover:text-primary"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span>.ics</span>
            </a>
            <a
              href={buildGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Add ${event.title} to Google Calendar`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg transition-colors hover:border-primary hover:text-primary"
            >
              <CalendarPlus className="size-3.5" aria-hidden="true" />
              <span>Google Calendar</span>
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
