import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarPlus,
  Clock,
  Download,
  ExternalLink,
  Globe,
  Handshake,
  MapPin,
  PencilLine,
  Repeat,
  ShieldAlert,
} from "lucide-react";
import {
  AccessBadge,
  CategoryBadge,
  DomainBadge,
  EventStatusBadge,
  ModeBadge,
  SeriesBadge,
} from "@/components/events/event-badges";
import { SiteShell } from "@/components/site-shell";
import { getPublicEventBySlugFn } from "@/lib/events/events-api";
import { buildEventJsonLd, buildGoogleCalendarUrl } from "@/lib/events/ics";
import {
  formatEventDateTimeSummaryIst,
  formatFullDateIst,
} from "@/lib/events/ist-date";
import {
  expandEventOccurrences,
  formatRRuleHumanReadable,
} from "@/lib/events/recurrence";
import { sanitizeMarkdown } from "@/lib/events/schema";
import { getSeedEvents } from "@/lib/events/seed-data";
import {
  ACCESS_LABELS,
  DOMAIN_LABELS,
  EVENT_DOMAIN_TO_SITE_DOMAIN,
  MODE_LABELS,
  formatSeriesLabel,
  formatVenueDisplay,
  isFieldPending,
} from "@/lib/events/types";
import { data, getDomain, t } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ params }) => {
    try {
      const event = await getPublicEventBySlugFn({ data: params.slug });
      return { event };
    } catch {
      const fallback =
        getSeedEvents().find((e) => e.slug === params.slug && !e.deleted) ?? null;
      return { event: fallback };
    }
  },
  head: ({ loaderData, params }) => {
    const ev = loaderData?.event;
    const baseUrl = data.site.baseUrl;
    const canonicalUrl = new URL(`/events/${params.slug}`, baseUrl).toString();
    if (!ev) {
      return {
        meta: [
          { title: `Event Not Found | ${data.org.shortName}` },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [{ rel: "canonical", href: canonicalUrl }],
      };
    }

    const title = data.site.titleTemplate.replace("{page}", ev.title);
    const description = ev.summary;
    const ogImg = ev.image?.url
      ? new URL(ev.image.url, baseUrl).toString()
      : new URL(data.site.assets.ogImage.src, baseUrl).toString();
    const ogAlt = ev.image?.alt ?? t(data.site.assets.ogImage.alt);

    return {
      meta: [
        { title: t(title) },
        { name: "description", content: description },
        { property: "og:title", content: ev.title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonicalUrl },
        { property: "og:site_name", content: data.org.shortName },
        { property: "og:type", content: "website" },
        { property: "og:image", content: ogImg },
        { property: "og:image:alt", content: ogAlt },
        { name: "twitter:card", content: data.site.twitterCard },
        { name: "twitter:title", content: ev.title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImg },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
    };
  },
  component: EventDetailPage,
});

function SafeMarkdownContent({ markdown }: { markdown?: string | null }) {
  const clean = sanitizeMarkdown(markdown);
  if (!clean) return null;

  const blocks = clean
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-base leading-relaxed text-fg">
      {blocks.map((block, idx) => {
        if (block.startsWith("### ")) {
          return (
            <h3 key={idx} className="font-display text-lg font-semibold">
              {block.slice(4)}
            </h3>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2 key={idx} className="font-display text-xl font-semibold">
              {block.slice(3)}
            </h2>
          );
        }
        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => l.startsWith("- ") || l.startsWith("* "))) {
          return (
            <ul key={idx} className="list-disc space-y-1.5 pl-5">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={idx}>{block}</p>;
      })}
    </div>
  );
}

function EventDetailPage() {
  const { event } = Route.useLoaderData();

  if (!event) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h1 className="font-display text-2xl font-semibold">
              Event Not Found
            </h1>
            <p className="mt-2 text-sm text-muted">
              The event you requested does not exist or is not currently public.
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>Return to Events Calendar</span>
            </Link>
          </div>
        </main>
      </SiteShell>
    );
  }

  const { dateLabel, timeLabel, ariaLabel } =
    formatEventDateTimeSummaryIst(event);
  const venueLabel = formatVenueDisplay(event);
  const venuePending = isFieldPending(event, "venue.name");
  const cityPending = isFieldPending(event, "venue.city");
  const onlineUrlPending = isFieldPending(event, "onlineUrl");
  const isPending = event.status === "pending";
  const isCancelled = event.status === "cancelled";
  const jsonLd = buildEventJsonLd(event);
  const recurrenceLabel = formatRRuleHumanReadable(event.recurrence?.rrule);
  const upcomingOccurrences = event.recurrence?.rrule
    ? expandEventOccurrences(event, "2026-09-01", "2027-09-30").slice(0, 12)
    : [];

  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className="mb-6">
          <Link
            to="/events"
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to Events Calendar</span>
          </Link>
        </div>

        {/* Status Banner for Tentative (C4) or Cancelled */}
        {isPending && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border-2 border-dashed border-accent bg-accent/10 p-4 text-sm text-fg"
          >
            <PencilLine
              className="mt-0.5 size-5 shrink-0 text-accent"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-accent">
                Tentative Event (Pencilled in)
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg">
                This event is on the {data.org.shortName} calendar, with one or more
                details marked &ldquo;To be confirmed&rdquo;.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-xl border border-fg/40 bg-soft p-4 text-sm text-fg"
          >
            <Ban className="mt-0.5 size-5 shrink-0 text-fg" aria-hidden="true" />
            <div>
              <p className="font-semibold">Cancelled Event</p>
              {event.cancelReason && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Reason: {event.cancelReason}
                </p>
              )}
            </div>
          </div>
        )}

        <article
          className={cn(
            "rounded-2xl p-6 sm:p-10",
            isPending
              ? "border-2 border-dashed border-accent/65 bg-surface/90"
              : "border border-border bg-surface",
          )}
        >
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={event.category} />
            <EventStatusBadge status={event.status} />
            <ModeBadge mode={event.mode} />
            <AccessBadge access={event.access} />
            {event.series.map((tag) => (
              <SeriesBadge key={tag} series={tag} />
            ))}
          </div>

          <h1
            className={cn(
              "mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl",
              isCancelled && "line-through text-muted",
            )}
          >
            {event.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted">
            {event.summary}
          </p>

          {/* Add to Calendar Bar (View-Only, No RSVP per C6) */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-bg p-4">
            <div className="text-xs text-muted">
              <span className="font-semibold text-fg">
                Access: {ACCESS_LABELS[event.access]}
              </span>
              {" · "}
              <span>
                Information listing only (no online registration or RSVP required on
                this page).
              </span>
            </div>

            {!isCancelled && (
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`/api/events/${event.slug}.ics`}
                  download={`${event.slug}.ics`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
                >
                  <Download className="size-4" aria-hidden="true" />
                  <span>Download .ics</span>
                </a>
                <a
                  href={buildGoogleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-fg transition-colors hover:border-primary hover:text-primary"
                >
                  <CalendarPlus
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  <span>Add to Google Calendar</span>
                </a>
              </div>
            )}
          </div>

          {/* Key Facts Grid */}
          <dl className="mt-8 grid gap-5 border-y border-border py-6 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Clock
                className="mt-1 size-5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Date &amp; Time (IST)
                </dt>
                <dd className="mt-1 text-sm font-semibold text-fg">
                  <time dateTime={event.start} aria-label={ariaLabel}>
                    {dateLabel}
                  </time>
                </dd>
                <dd className="mt-0.5 text-sm text-muted">{timeLabel}</dd>
                {recurrenceLabel && (
                  <dd className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Repeat className="size-3.5" aria-hidden="true" />
                    <span>Recurring: {recurrenceLabel}</span>
                  </dd>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin
                className="mt-1 size-5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Venue &amp; City
                </dt>
                <dd
                  className={cn(
                    "mt-1 text-sm font-semibold",
                    venuePending ? "text-accent" : "text-fg",
                  )}
                >
                  Venue: {venueLabel}
                </dd>
                {event.venue?.address && (
                  <dd className="mt-0.5 text-xs text-muted">
                    {event.venue.address}
                  </dd>
                )}
                <dd className="mt-0.5 text-sm text-muted">
                  City:{" "}
                  {cityPending
                    ? "To be confirmed"
                    : event.venue?.city || "To be confirmed"}
                </dd>
                {event.venue?.mapUrl && (
                  <dd className="mt-1.5">
                    <a
                      href={event.venue.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>View on Map</span>
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </dd>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2
                className="mt-1 size-5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Mode &amp; Access
                </dt>
                <dd className="mt-1 text-sm font-semibold text-fg">
                  {MODE_LABELS[event.mode]} · {ACCESS_LABELS[event.access]}
                </dd>
                {(event.mode === "online" || event.mode === "hybrid") && (
                  <dd className="mt-1 text-xs text-muted">
                    {onlineUrlPending ? (
                      <span>Online Link: To be confirmed</span>
                    ) : event.onlineUrl ? (
                      <a
                        href={event.onlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        <Globe className="size-3.5" aria-hidden="true" />
                        <span>Join Online Session</span>
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span>Online Link: To be confirmed</span>
                    )}
                  </dd>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Handshake
                className="mt-1 size-5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Series, Partners &amp; Domains
                </dt>
                <dd className="mt-1 text-sm text-fg">
                  {event.partners.length > 0 ? (
                    <span className="font-semibold">
                      Partners: {event.partners.join(", ")}
                    </span>
                  ) : (
                    <span className="text-muted">
                      Organised by {data.org.shortName}, {t(data.org.parent.shortName)}
                    </span>
                  )}
                </dd>
                {event.series.length > 0 && (
                  <dd className="mt-1 text-xs font-medium text-primary">
                    Series: {event.series.map(formatSeriesLabel).join(", ")}
                  </dd>
                )}
                {event.domains.length > 0 && (
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {event.domains.map((dom) => {
                      const siteDomId = EVENT_DOMAIN_TO_SITE_DOMAIN[dom];
                      let domPath: string | null = null;
                      try {
                        domPath = getDomain(siteDomId).path;
                      } catch {
                        domPath = null;
                      }
                      return domPath ? (
                        <Link
                          key={dom}
                          to={domPath}
                          className="inline-flex items-center rounded-md border border-border bg-bg px-2.5 py-1 text-xs font-medium text-fg hover:border-primary hover:text-primary"
                        >
                          {DOMAIN_LABELS[dom]}
                        </Link>
                      ) : (
                        <DomainBadge key={dom} domain={dom} />
                      );
                    })}
                  </dd>
                )}
              </div>
            </div>
          </dl>

          {/* Pending Fields Checklist when any field is unconfirmed */}
          {event.pendingFields.length > 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-accent/60 bg-accent/5 p-4">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent uppercase">
                <ShieldAlert className="size-4" aria-hidden="true" />
                <span>Details To Be Confirmed</span>
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-fg">
                {event.pendingFields.map((pf) => (
                  <li key={pf}>
                    <span className="font-semibold">{pf}:</span> To be confirmed
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Event Image */}
          {event.image?.url && (
            <figure className="mt-8 overflow-hidden rounded-xl border border-border bg-bg">
              <img
                src={event.image.url}
                alt={event.image.alt}
                className="max-h-96 w-full object-cover"
              />
              <figcaption className="px-4 py-2.5 text-xs text-muted">
                {event.image.alt}
              </figcaption>
            </figure>
          )}

          {/* Full Description */}
          {event.description && (
            <div className="mt-8">
              <h2 className="mb-3 font-display text-xl font-semibold">
                About This Event
              </h2>
              <SafeMarkdownContent markdown={event.description} />
            </div>
          )}

          {/* Recurring Occurrences List */}
          {upcomingOccurrences.length > 1 && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="mb-3 font-display text-lg font-semibold">
                Scheduled Occurrences ({upcomingOccurrences.length})
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {upcomingOccurrences.map((occ) => (
                  <li
                    key={occ.occurrenceKey}
                    className="rounded-lg border border-border bg-bg px-3.5 py-2 text-xs font-medium text-fg"
                  >
                    {formatFullDateIst(occ.occurrenceStart)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* External / Report Links */}
          {event.links.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="mb-3 font-display text-lg font-semibold">
                Related Reports &amp; Links
              </h2>
              <div className="flex flex-wrap gap-3">
                {event.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:border-primary"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </SiteShell>
  );
}
