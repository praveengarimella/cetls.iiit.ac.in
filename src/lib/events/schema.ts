import { normalizeIstIso, toEpochMs } from "./ist-date.ts";
import { parseRRule } from "./recurrence.ts";
import {
  EVENT_ACCESS_TYPES,
  EVENT_CATEGORIES,
  EVENT_DOMAINS,
  EVENT_MODES,
  EVENT_STATUSES,
  PUBLIC_EVENT_STATUSES,
  normalizeDomainSlug,
  type AuditDiffValue,
  type CetlsEvent,
  type EventAccess,
  type EventAuditDiff,
  type EventCategory,
  type EventDomain,
  type EventImage,
  type EventLink,
  type EventMode,
  type EventRecurrence,
  type EventStatus,
  type EventVenue,
} from "./types.ts";

const KEBAB_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Strips raw HTML tags and dangerous URI schemes from markdown input.
 */
export function sanitizeMarkdown(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "")
    .trim();
}

export function isValidHttpsUrl(urlStr: string, allowRelativePath = false): boolean {
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  if (allowRelativePath && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export interface EventMutationInput {
  slug?: string;
  title: string;
  summary: string;
  description?: string | null;
  category: EventCategory;
  domains?: string[];
  start: string;
  end?: string;
  allDay?: boolean;
  timezone?: string;
  recurrence?: EventRecurrence | null;
  recurrenceParentId?: string | null;
  recurrenceOriginalDate?: string | null;
  mode: EventMode;
  venue?: Partial<EventVenue> | null;
  onlineUrl?: string | null;
  access: EventAccess;
  series?: string[];
  partners?: string[];
  image?: EventImage | null;
  status?: EventStatus;
  pendingFields?: string[];
  cancelReason?: string | null;
  links?: EventLink[];
}

export interface ValidatedEventPayload {
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  category: EventCategory;
  domains: EventDomain[];
  start: string;
  end: string;
  allDay: boolean;
  timezone: string;
  recurrence: EventRecurrence | null;
  recurrenceParentId: string | null;
  recurrenceOriginalDate: string | null;
  mode: EventMode;
  venue: EventVenue;
  onlineUrl: string | null;
  access: EventAccess;
  series: string[];
  partners: string[];
  image: EventImage | null;
  status: EventStatus;
  pendingFields: string[];
  cancelReason: string | null;
  links: EventLink[];
}

export function validateEventInput(
  input: EventMutationInput,
  options?: { allowPublicStatus?: boolean },
): { ok: true; data: ValidatedEventPayload } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const title = (input.title ?? "").trim();
  if (!title) {
    errors.push("Title is required.");
  } else if (title.length > 120) {
    errors.push("Title must be 120 characters or fewer.");
  }

  const summary = (input.summary ?? "").trim();
  if (!summary) {
    errors.push("Summary is required.");
  } else if (summary.length > 280) {
    errors.push("Summary must be 280 characters or fewer.");
  }

  const slug = (input.slug?.trim() || slugifyTitle(title)).toLowerCase();
  if (!slug || !KEBAB_SLUG_RE.test(slug)) {
    errors.push("Slug is required and must be lowercase kebab-case (e.g. 'cetls-relaunch-2026').");
  }

  if (!EVENT_CATEGORIES.includes(input.category)) {
    errors.push(`Category must be one of: ${EVENT_CATEGORIES.join(", ")}.`);
  }

  const domains: EventDomain[] = [];
  for (const rawDom of input.domains ?? []) {
    const norm = normalizeDomainSlug(rawDom);
    if (!norm || !EVENT_DOMAINS.includes(norm)) {
      errors.push(`Invalid domain '${rawDom}'. Allowed: ${EVENT_DOMAINS.join(", ")}.`);
    } else if (!domains.includes(norm)) {
      domains.push(norm);
    }
  }

  const allDay = Boolean(input.allDay);
  const pendingFields = Array.from(
    new Set(
      (input.pendingFields ?? [])
        .map((f) => f.trim())
        .filter(Boolean),
    ),
  );
  const pendingLower = pendingFields.map((f) => f.toLowerCase());

  let startIso = "";
  let endIso = "";
  try {
    if (!input.start?.trim()) {
      errors.push("Start date/time is required.");
    } else {
      startIso = normalizeIstIso(input.start, false);
    }
  } catch {
    errors.push("Start date/time must be a valid ISO 8601 date or datetime.");
  }

  try {
    const rawEnd = input.end?.trim() || (allDay && input.start ? input.start.trim().slice(0, 10) : "");
    if (!rawEnd) {
      if (
        startIso &&
        (allDay || pendingLower.includes("end time") || pendingLower.includes("start time"))
      ) {
        endIso = normalizeIstIso(startIso.slice(0, 10), true);
      } else {
        errors.push("End date/time is required.");
      }
    } else {
      endIso = normalizeIstIso(rawEnd, allDay && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd));
    }
  } catch {
    errors.push("End date/time must be a valid ISO 8601 date or datetime.");
  }

  if (startIso && endIso) {
    const startMs = toEpochMs(startIso, false);
    const endMs = toEpochMs(endIso, allDay);
    if (endMs <= startMs) {
      errors.push("End time must be after the start time.");
    }
  }

  if (!EVENT_MODES.includes(input.mode)) {
    errors.push(`Mode must be one of: ${EVENT_MODES.join(", ")}.`);
  }

  if (!EVENT_ACCESS_TYPES.includes(input.access)) {
    errors.push(`Access must be one of: ${EVENT_ACCESS_TYPES.join(", ")}.`);
  }

  const venueName = input.venue?.name?.trim() ?? "";
  const venueCity = input.venue?.city?.trim() ?? "";
  const venueAddress = input.venue?.address?.trim() ?? "";
  const venueMapUrl = input.venue?.mapUrl?.trim() ?? "";

  const venueMarkedPending =
    pendingLower.includes("venue") || pendingLower.includes("venue.name");

  if (
    (input.mode === "in-person" || input.mode === "hybrid") &&
    !venueMarkedPending &&
    !venueName
  ) {
    errors.push(
      "Venue name is required for in-person and hybrid events unless 'venue.name' is marked pending.",
    );
  }

  if (
    (input.mode === "in-person" || input.mode === "hybrid") &&
    !venueCity &&
    !pendingLower.includes("venue.city") &&
    !pendingLower.includes("venue")
  ) {
    errors.push("City is required for in-person and hybrid events.");
  }

  if (venueMapUrl && !isValidHttpsUrl(venueMapUrl)) {
    errors.push("Venue map URL must use https://.");
  }

  const onlineUrlRaw = input.onlineUrl?.trim() ?? "";
  if (onlineUrlRaw && !isValidHttpsUrl(onlineUrlRaw)) {
    errors.push("Online event URL must use https://.");
  }
  const onlineUrl =
    input.mode === "online" || input.mode === "hybrid"
      ? onlineUrlRaw || null
      : null;

  let recurrence: EventRecurrence | null = null;
  if (input.recurrence && input.recurrence.rrule?.trim()) {
    const rruleClean = input.recurrence.rrule.trim().replace(/^RRULE:/i, "");
    const parsed = parseRRule(rruleClean);
    if (!parsed) {
      errors.push(
        "Recurrence RRULE must be a valid RFC 5545 rule (e.g. 'FREQ=MONTHLY;INTERVAL=1;COUNT=6').",
      );
    } else {
      const exdates = Array.from(
        new Set(
          (input.recurrence.exdates ?? [])
            .map((d) => d.trim().slice(0, 10))
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
        ),
      );
      recurrence = { rrule: rruleClean, exdates };
    }
  }

  let image: EventImage | null = null;
  if (input.image && input.image.url?.trim()) {
    const imgUrl = input.image.url.trim();
    const imgAlt = input.image.alt?.trim() ?? "";
    if (!isValidHttpsUrl(imgUrl, true)) {
      errors.push("Image URL must use https:// or be an uploaded site asset path.");
    }
    if (!imgAlt) {
      errors.push("Image alt text is required whenever an image is provided.");
    }
    image = { url: imgUrl, alt: imgAlt };
  }

  const links: EventLink[] = [];
  for (const link of input.links ?? []) {
    const label = link.label?.trim() ?? "";
    const url = link.url?.trim() ?? "";
    if (!label && !url) continue;
    if (!label) {
      errors.push("Every external link must include a label.");
    }
    if (!isValidHttpsUrl(url)) {
      errors.push(`Link URL '${url || "(empty)"}' must use https://.`);
    }
    if (label && isValidHttpsUrl(url)) {
      links.push({ label, url });
    }
  }

  const series = Array.from(
    new Set(
      (input.series ?? [])
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const partners = Array.from(
    new Set(
      (input.partners ?? [])
        .map((p) => p.trim())
        .filter(Boolean),
    ),
  );

  const status: EventStatus = input.status ?? "draft";
  if (!EVENT_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${EVENT_STATUSES.join(", ")}.`);
  }
  if (!options?.allowPublicStatus && PUBLIC_EVENT_STATUSES.includes(status)) {
    errors.push(
      "Events cannot become public directly on create/edit without an explicit Admin Approve & Publish action.",
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      slug,
      title,
      summary,
      description: sanitizeMarkdown(input.description) || null,
      category: input.category,
      domains,
      start: startIso,
      end: endIso,
      allDay,
      timezone: "Asia/Kolkata",
      recurrence,
      recurrenceParentId: input.recurrenceParentId?.trim() || null,
      recurrenceOriginalDate: input.recurrenceOriginalDate?.trim() || null,
      mode: input.mode,
      venue: {
        name: venueName,
        address: venueAddress || undefined,
        city: venueCity,
        mapUrl: venueMapUrl || undefined,
      },
      onlineUrl,
      access: input.access,
      series,
      partners,
      image,
      status,
      pendingFields,
      cancelReason: input.cancelReason?.trim() || null,
      links,
    },
  };
}

const TRACKED_DIFF_FIELDS: Array<keyof CetlsEvent> = [
  "slug",
  "title",
  "summary",
  "description",
  "category",
  "domains",
  "start",
  "end",
  "allDay",
  "recurrence",
  "mode",
  "venue",
  "onlineUrl",
  "access",
  "series",
  "partners",
  "image",
  "status",
  "approvedBy",
  "approvedAt",
  "pendingFields",
  "cancelReason",
  "links",
  "deleted",
];

export function computeEventDiff(
  before: Partial<CetlsEvent> | null,
  after: Partial<CetlsEvent>,
): EventAuditDiff {
  const diff: EventAuditDiff = {};
  for (const key of TRACKED_DIFF_FIELDS) {
    const prevVal = (before ? (before[key] ?? null) : null) as AuditDiffValue;
    const nextVal = (after[key] ?? null) as AuditDiffValue;
    if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      diff[key] = { before: prevVal, after: nextVal };
    }
  }
  return diff;
}
