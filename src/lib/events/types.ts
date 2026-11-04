export const EVENT_CATEGORIES = [
  "roundtable",
  "workshop",
  "talk",
  "launch",
  "advisory",
  "internal",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_DOMAINS = [
  "k12",
  "higher-ed",
  "professionals-executives",
  "third-age",
] as const;
export type EventDomain = (typeof EVENT_DOMAINS)[number];

export const EVENT_MODES = ["in-person", "online", "hybrid"] as const;
export type EventMode = (typeof EVENT_MODES)[number];

export const EVENT_ACCESS_TYPES = ["open", "invitation-only"] as const;
export type EventAccess = (typeof EVENT_ACCESS_TYPES)[number];

export const EVENT_STATUSES = [
  "draft",
  "submitted",
  "pending",
  "published",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const PUBLIC_EVENT_STATUSES: ReadonlyArray<EventStatus> = [
  "pending",
  "published",
  "cancelled",
];

export type EventUserRole = "admin" | "editor";

export interface EventRecurrence {
  rrule: string;
  exdates: string[];
}

export interface EventVenue {
  name: string;
  address?: string;
  city: string;
  mapUrl?: string;
}

export interface EventImage {
  url: string;
  alt: string;
}

export interface EventLink {
  label: string;
  url: string;
}

export interface CetlsEvent {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string | null;
  category: EventCategory;
  domains: EventDomain[];
  start: string;
  end: string;
  allDay: boolean;
  timezone: string;
  recurrence?: EventRecurrence | null;
  recurrenceParentId?: string | null;
  recurrenceOriginalDate?: string | null;
  mode: EventMode;
  venue: EventVenue;
  onlineUrl?: string | null;
  access: EventAccess;
  series: string[];
  partners: string[];
  image?: EventImage | null;
  status: EventStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  pendingFields: string[];
  cancelReason?: string | null;
  links: EventLink[];
  deleted: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface ExpandedEventOccurrence extends CetlsEvent {
  occurrenceKey: string;
  occurrenceDate: string; // YYYY-MM-DD in IST
  occurrenceStart: string;
  occurrenceEnd: string;
  isRecurringInstance: boolean;
}

export type AuditDiffValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | EventRecurrence
  | EventVenue
  | EventImage
  | EventLink[];

export type EventAuditDiff = Record<
  string,
  { before: AuditDiffValue; after: AuditDiffValue }
>;

export interface EventAuditEntry {
  id: number;
  eventId: string;
  eventSlug: string;
  actorEmail: string;
  action: string;
  diff: EventAuditDiff;
  createdAt: string;
}

export interface EventUserRecord {
  email: string;
  name: string;
  role: EventUserRole;
  addedBy: string | null;
  createdAt: string;
}

export interface EventsFilterParams {
  from?: string;
  to?: string;
  category?: string;
  domain?: string;
  city?: string;
  mode?: string;
  series?: string;
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  roundtable: "Roundtable",
  workshop: "Workshop",
  talk: "Talk",
  launch: "Launch",
  advisory: "Advisory",
  internal: "Internal",
};

export const DOMAIN_LABELS: Record<EventDomain, string> = {
  k12: "K-12",
  "higher-ed": "Higher Ed",
  "professionals-executives": "Professionals & Executives",
  "third-age": "Third-Age Learning",
};

/** Maps canonical event domain slug to site-data.json domain id */
export const EVENT_DOMAIN_TO_SITE_DOMAIN: Record<EventDomain, string> = {
  k12: "k12",
  "higher-ed": "higher-education",
  "professionals-executives": "professionals",
  "third-age": "third-age",
};

export const MODE_LABELS: Record<EventMode, string> = {
  "in-person": "In-person",
  online: "Online",
  hybrid: "Hybrid",
};

export const ACCESS_LABELS: Record<EventAccess, string> = {
  open: "Open",
  "invitation-only": "Invitation only",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  submitted: "Submitted for Approval",
  pending: "Tentative (Pending Details)",
  published: "Published",
  cancelled: "Cancelled",
};

export const SERIES_LABELS: Record<string, string> = {
  "eksaq-partnership": "EKSAQ partnership",
};

export function formatSeriesLabel(tag: string): string {
  return SERIES_LABELS[tag] ?? tag;
}

export function normalizeDomainSlug(raw: string): EventDomain | null {
  const clean = raw.trim().toLowerCase();
  if (clean === "k12" || clean === "k-12") return "k12";
  if (clean === "higher-ed" || clean === "higher-education") return "higher-ed";
  if (
    clean === "professionals-executives" ||
    clean === "professionals" ||
    clean === "executives"
  ) {
    return "professionals-executives";
  }
  if (clean === "third-age" || clean === "third-age-learning") return "third-age";
  return null;
}

export function isFieldPending(event: Pick<CetlsEvent, "pendingFields" | "status">, fieldPath: string): boolean {
  const fields = event.pendingFields.map((f) => f.trim().toLowerCase());
  const target = fieldPath.trim().toLowerCase();
  if (fields.includes(target)) return true;
  if (target === "venue.name" && fields.includes("venue")) return true;
  if (
    (target === "start" || target === "start time" || target === "time") &&
    (fields.includes("start") || fields.includes("start time") || fields.includes("time"))
  ) {
    return true;
  }
  if (
    (target === "end" || target === "end time" || target === "time") &&
    (fields.includes("end") || fields.includes("end time") || fields.includes("time"))
  ) {
    return true;
  }
  return false;
}

/**
 * Formats a venue name respecting pending status (e.g., "To be confirmed (IIC or IHC)").
 */
export function formatVenueDisplay(event: Pick<CetlsEvent, "venue" | "pendingFields" | "status" | "mode">): string {
  const rawName = event.venue?.name?.trim() ?? "";
  const venuePending = isFieldPending(event, "venue.name");
  if (venuePending) {
    if (!rawName || rawName.toLowerCase() === "to be confirmed" || rawName.toLowerCase() === "tbc") {
      return "To be confirmed";
    }
    const stripped = rawName.replace(/\s*\(pending\)\s*$/i, "").trim();
    if (stripped.toLowerCase().startsWith("to be confirmed")) {
      return stripped;
    }
    return `To be confirmed (${stripped})`;
  }
  if (!rawName) {
    return event.mode === "online" ? "Online" : "To be confirmed";
  }
  return rawName;
}
