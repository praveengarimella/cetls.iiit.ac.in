import { data, t } from "../site-data.ts";
import { getIstParts, normalizeIstIso } from "./ist-date.ts";
import { formatVenueDisplay, isFieldPending, type CetlsEvent } from "./types.ts";

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsLocalDateTime(iso: string): string {
  const p = getIstParts(iso);
  const y = String(p.year).padStart(4, "0");
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  const hh = String(p.hour).padStart(2, "0");
  const mm = String(p.minute).padStart(2, "0");
  const ss = String(p.second).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

function formatIcsDateOnly(iso: string, addDays = 0): string {
  const p = getIstParts(iso);
  const dt = new Date(Date.UTC(p.year, p.month - 1, p.day + addDays));
  const y = String(dt.getUTCFullYear()).padStart(4, "0");
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatUtcTimestamp(iso: string): string {
  const d = new Date(normalizeIstIso(iso));
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

function buildVEventBlock(event: CetlsEvent): string[] {
  const uid = `${event.id}@cetls.iiit.ac.in`;
  const dtstamp = formatUtcTimestamp(event.updatedAt || event.createdAt);
  const timePending =
    isFieldPending(event, "start time") || isFieldPending(event, "end time");
  const useAllDay = event.allDay || timePending;

  const lines: string[] = ["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${dtstamp}`];

  if (useAllDay) {
    const startDate = formatIcsDateOnly(event.start, 0);
    const endParts = getIstParts(event.end);
    const startParts = getIstParts(event.start);
    const spanDays = Math.max(
      1,
      Math.round(
        (Date.UTC(endParts.year, endParts.month - 1, endParts.day) -
          Date.UTC(startParts.year, startParts.month - 1, startParts.day)) /
          (24 * 60 * 60 * 1000),
      ) + 1,
    );
    const endDateExclusive = formatIcsDateOnly(event.start, spanDays);
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDateExclusive}`);
  } else {
    lines.push(`DTSTART;TZID=Asia/Kolkata:${formatIcsLocalDateTime(event.start)}`);
    lines.push(`DTEND;TZID=Asia/Kolkata:${formatIcsLocalDateTime(event.end)}`);
  }

  const summaryPrefix =
    event.status === "cancelled"
      ? "[CANCELLED] "
      : event.status === "pending"
        ? "[Tentative] "
        : "";
  lines.push(`SUMMARY:${escapeIcsText(`${summaryPrefix}${event.title}`)}`);

  const descParts = [event.summary];
  if (event.description) descParts.push(event.description);
  if (event.status === "pending") {
    descParts.push("Note: Tentative event — some details are to be confirmed.");
  }
  if (event.status === "cancelled" && event.cancelReason) {
    descParts.push(`Cancelled: ${event.cancelReason}`);
  }
  const eventUrl = new URL(`/events/${event.slug}`, data.site.baseUrl).toString();
  descParts.push(`Details: ${eventUrl}`);
  lines.push(`DESCRIPTION:${escapeIcsText(descParts.join("\n\n"))}`);

  const venueDisplay = formatVenueDisplay(event);
  const locationStr = [venueDisplay, event.venue?.city]
    .filter(Boolean)
    .join(", ");
  if (locationStr) {
    lines.push(`LOCATION:${escapeIcsText(locationStr)}`);
  }

  lines.push(`URL:${eventUrl}`);

  const icsStatus =
    event.status === "cancelled"
      ? "CANCELLED"
      : event.status === "pending"
        ? "TENTATIVE"
        : "CONFIRMED";
  lines.push(`STATUS:${icsStatus}`);

  if (event.recurrence?.rrule) {
    const cleanRule = event.recurrence.rrule.replace(/^RRULE:/i, "").trim();
    if (cleanRule) {
      lines.push(`RRULE:${cleanRule}`);
    }
    for (const ex of event.recurrence.exdates ?? []) {
      const cleanEx = ex.trim().slice(0, 10).replace(/-/g, "");
      if (/^\d{8}$/.test(cleanEx)) {
        if (useAllDay) {
          lines.push(`EXDATE;VALUE=DATE:${cleanEx}`);
        } else {
          const startClock = formatIcsLocalDateTime(event.start).slice(8);
          lines.push(`EXDATE;TZID=Asia/Kolkata:${cleanEx}${startClock}`);
        }
      }
    }
  }

  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsFeed(events: CetlsEvent[], calName?: string): string {
  const title = calName ?? `${data.org.shortName} Events Calendar (${t(data.org.parent.shortName)})`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CETLS IIIT Hyderabad//Events Calendar v0.2//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(title)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const ev of events) {
    lines.push(...buildVEventBlock(ev));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function buildGoogleCalendarUrl(event: CetlsEvent): string {
  const timePending =
    isFieldPending(event, "start time") || isFieldPending(event, "end time");
  const useAllDay = event.allDay || timePending;

  let datesParam: string;
  if (useAllDay) {
    const startDate = formatIcsDateOnly(event.start, 0);
    const endDate = formatIcsDateOnly(event.start, 1);
    datesParam = `${startDate}/${endDate}`;
  } else {
    datesParam = `${formatIcsLocalDateTime(event.start)}/${formatIcsLocalDateTime(event.end)}`;
  }

  const venueDisplay = formatVenueDisplay(event);
  const location = [venueDisplay, event.venue?.city].filter(Boolean).join(", ");
  const eventUrl = new URL(`/events/${event.slug}`, data.site.baseUrl).toString();
  const details = [
    event.summary,
    event.description ?? "",
    `Event page: ${eventUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text:
      event.status === "pending" ? `[Tentative] ${event.title}` : event.title,
    dates: datesParam,
    details,
    location,
    ctz: "Asia/Kolkata",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildEventJsonLd(event: CetlsEvent): Record<string, unknown> {
  const eventUrl = new URL(`/events/${event.slug}`, data.site.baseUrl).toString();
  const attendanceMode =
    event.mode === "online"
      ? "https://schema.org/OnlineEventAttendanceMode"
      : event.mode === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode";

  const eventStatus =
    event.status === "cancelled"
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled";

  const imageUrl = event.image?.url
    ? new URL(event.image.url, data.site.baseUrl).toString()
    : new URL(data.site.assets.ogImage.src, data.site.baseUrl).toString();

  const venueName = formatVenueDisplay(event);
  const physicalPlace = {
    "@type": "Place",
    name: venueName,
    address: {
      "@type": "PostalAddress",
      streetAddress: event.venue?.address || undefined,
      addressLocality: event.venue?.city || data.org.address.city,
      addressCountry: "IN",
    },
  };

  const virtualLocation = event.onlineUrl
    ? {
        "@type": "VirtualLocation",
        url: event.onlineUrl,
      }
    : {
        "@type": "VirtualLocation",
        url: eventUrl,
      };

  const location =
    event.mode === "online"
      ? virtualLocation
      : event.mode === "hybrid"
        ? [physicalPlace, virtualLocation]
        : physicalPlace;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    startDate: normalizeIstIso(event.start, false),
    endDate: normalizeIstIso(event.end, event.allDay),
    eventStatus,
    eventAttendanceMode: attendanceMode,
    location,
    image: [imageUrl],
    organizer: {
      "@type": "Organization",
      name: `${t(data.org.name.value)} (${data.org.shortName}), ${t(data.org.parent.shortName)}`,
      url: data.site.baseUrl,
    },
    isAccessibleForFree: event.access === "open",
    url: eventUrl,
  };
}
