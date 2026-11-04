import { randomUUID } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql, type Sql } from "@/lib/db";
import { getIstParts, nowIstIso, toEpochMs } from "./ist-date";
import { expandEventOccurrences } from "./recurrence";
import {
  computeEventDiff,
  validateEventInput,
  type EventMutationInput,
} from "./schema";
import { getInitialAdminUsers, getSeedEvents } from "./seed-data";
import {
  PUBLIC_EVENT_STATUSES,
  normalizeDomainSlug,
  type CetlsEvent,
  type EventAccess,
  type EventAuditDiff,
  type EventAuditEntry,
  type EventCategory,
  type EventDomain,
  type EventImage,
  type EventLink,
  type EventMode,
  type EventRecurrence,
  type EventStatus,
  type EventUserRecord,
  type EventUserRole,
  type EventVenue,
  type EventsFilterParams,
  type ExpandedEventOccurrence,
} from "./types";

interface RawEventRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  category: string;
  domains: string;
  start_iso: string;
  end_iso: string;
  all_day: boolean;
  timezone: string;
  recurrence: string | null;
  recurrence_parent_id: string | null;
  recurrence_original_date: string | null;
  mode: string;
  venue: string;
  online_url: string | null;
  access: string;
  series: string;
  partners: string;
  image: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  pending_fields: string;
  cancel_reason: string | null;
  links: string;
  deleted: boolean;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

interface RawAuditRow {
  id: number;
  event_id: string;
  event_slug: string;
  actor_email: string;
  action: string;
  diff_json: string;
  created_at: string;
}

interface RawUserRow {
  email: string;
  name: string;
  role: string;
  added_by: string | null;
  created_at: string | Date;
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapRowToEvent(row: RawEventRow): CetlsEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category as EventCategory,
    domains: safeParseJson<EventDomain[]>(row.domains, []),
    start: row.start_iso,
    end: row.end_iso,
    allDay: Boolean(row.all_day),
    timezone: row.timezone || "Asia/Kolkata",
    recurrence: safeParseJson<EventRecurrence | null>(row.recurrence, null),
    recurrenceParentId: row.recurrence_parent_id,
    recurrenceOriginalDate: row.recurrence_original_date,
    mode: row.mode as EventMode,
    venue: safeParseJson<EventVenue>(row.venue, { name: "", city: "" }),
    onlineUrl: row.online_url,
    access: row.access as EventAccess,
    series: safeParseJson<string[]>(row.series, []),
    partners: safeParseJson<string[]>(row.partners, []),
    image: safeParseJson<EventImage | null>(row.image, null),
    status: row.status as EventStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    pendingFields: safeParseJson<string[]>(row.pending_fields, []),
    cancelReason: row.cancel_reason,
    links: safeParseJson<EventLink[]>(row.links, []),
    deleted: Boolean(row.deleted),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

let seedPromise: Promise<void> | null = null;

export async function ensureEventsSeeded(sql: Sql): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }
  seedPromise = (async () => {
    for (const admin of getInitialAdminUsers()) {
      await sql`
        insert into cetls_event_users (email, name, role, added_by)
        values (${admin.email}, ${admin.name}, ${admin.role}, 'system-seed')
        on conflict (email) do nothing
      `;
    }

    const existing = await sql<{ cnt: number }>`
      select count(*) as cnt from cetls_events
    `;
    if ((existing[0]?.cnt ?? 0) > 0) return;

    for (const ev of getSeedEvents()) {
      await sql`
        insert into cetls_events (
          id, slug, title, summary, description, category, domains,
          start_iso, end_iso, all_day, timezone, recurrence,
          recurrence_parent_id, recurrence_original_date,
          mode, venue, online_url, access, series, partners, image,
          status, approved_by, approved_at, pending_fields, cancel_reason,
          links, deleted, created_by, created_at, updated_by, updated_at
        ) values (
          ${ev.id},
          ${ev.slug},
          ${ev.title},
          ${ev.summary},
          ${ev.description ?? null},
          ${ev.category},
          ${JSON.stringify(ev.domains ?? [])},
          ${ev.start},
          ${ev.end},
          ${Boolean(ev.allDay)},
          ${ev.timezone || "Asia/Kolkata"},
          ${ev.recurrence ? JSON.stringify(ev.recurrence) : null},
          ${ev.recurrenceParentId ?? null},
          ${ev.recurrenceOriginalDate ?? null},
          ${ev.mode},
          ${JSON.stringify(ev.venue ?? { name: "", city: "" })},
          ${ev.onlineUrl ?? null},
          ${ev.access},
          ${JSON.stringify(ev.series ?? [])},
          ${JSON.stringify(ev.partners ?? [])},
          ${ev.image ? JSON.stringify(ev.image) : null},
          ${ev.status},
          ${ev.approvedBy ?? null},
          ${ev.approvedAt ?? null},
          ${JSON.stringify(ev.pendingFields ?? [])},
          ${ev.cancelReason ?? null},
          ${JSON.stringify(ev.links ?? [])},
          ${Boolean(ev.deleted)},
          ${ev.createdBy},
          ${ev.createdAt},
          ${ev.updatedBy},
          ${ev.updatedAt}
        )
        on conflict (slug) do nothing
      `;

      await sql`
        insert into cetls_event_audit (
          event_id, event_slug, actor_email, action, diff_json, created_at
        ) values (
          ${ev.id},
          ${ev.slug},
          ${ev.createdBy},
          'seed',
          ${JSON.stringify(computeEventDiff(null, ev))},
          ${ev.createdAt}
        )
      `;
    }
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });

  return seedPromise;
}

// In-memory rate limiter for write endpoints (per actor/IP, 60 writes per minute)
const writeRateBuckets = new Map<string, { count: number; resetAt: number }>();

export function assertWriteRateLimit(key: string, maxPerMinute = 60): void {
  const now = Date.now();
  const bucket = writeRateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    writeRateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > maxPerMinute) {
    const err = new Error("Rate limit exceeded. Please wait before making more changes.");
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
}

export function assertCsrfOrigin(request?: Request | null): void {
  const req = request ?? getRequest();
  if (!req) return;
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite === "cross-site") {
    const err = new Error("Cross-site write requests are forbidden.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        const err = new Error("Origin mismatch on write request.");
        (err as Error & { status?: number }).status = 403;
        throw err;
      }
    } catch {
      const err = new Error("Invalid Origin header.");
      (err as Error & { status?: number }).status = 403;
      throw err;
    }
  }
}

export interface AuthenticatedEventActor {
  userId: string;
  email: string;
  name: string;
  role: EventUserRole;
}

export async function getOptionalEventActor(
  bearerToken?: string,
  requestOverride?: Request,
): Promise<{
  signedIn: boolean;
  email: string | null;
  actor: AuthenticatedEventActor | null;
}> {
  let sessionUser: { id: string; email: string | null } | null = null;

  if (requestOverride) {
    let headers = requestOverride.headers;
    if (bearerToken) {
      headers = new Headers(requestOverride.headers);
      headers.set("Authorization", `Bearer ${bearerToken}`);
    }
    const session = await auth.api.getSession({ headers });
    if (session?.user) {
      sessionUser = {
        id: session.user.id,
        email: session.user.email ?? null,
      };
    }
  } else {
    sessionUser = await getSessionUser(bearerToken);
  }

  if (!sessionUser || !sessionUser.email) {
    return { signedIn: false, email: null, actor: null };
  }

  const normalizedEmail = sessionUser.email.toLowerCase().trim();
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = await sql<RawUserRow>`
    select email, name, role, added_by, created_at
    from cetls_event_users
    where lower(email) = ${normalizedEmail}
    limit 1
  `;

  if (rows.length === 0) {
    return { signedIn: true, email: normalizedEmail, actor: null };
  }

  const row = rows[0];
  return {
    signedIn: true,
    email: normalizedEmail,
    actor: {
      userId: sessionUser.id,
      email: row.email,
      name: row.name,
      role: (row.role === "admin" ? "admin" : "editor") as EventUserRole,
    },
  };
}

export async function requireEventActor(
  minRole: EventUserRole,
  options?: { bearerToken?: string; request?: Request },
): Promise<AuthenticatedEventActor> {
  const status = await getOptionalEventActor(options?.bearerToken, options?.request);
  if (!status.signedIn) {
    const err = new Error("Authentication required. Please sign in at /admin.");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  if (!status.actor) {
    const err = new Error(
      `Access refused: ${status.email} is not on the CETLS Events allowlist.`,
    );
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  if (minRole === "admin" && status.actor.role !== "admin") {
    const err = new Error(
      "Insufficient permissions: this action requires an administrator role.",
    );
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return status.actor;
}

export function applyEventsFilters(
  events: CetlsEvent[],
  filters: EventsFilterParams,
): {
  events: CetlsEvent[];
  occurrences: ExpandedEventOccurrence[];
  cities: string[];
  seriesTags: string[];
} {
  const publicEvents = events.filter(
    (ev) => !ev.deleted && PUBLIC_EVENT_STATUSES.includes(ev.status),
  );

  const citiesSet = new Set<string>();
  const seriesSet = new Set<string>(["eksaq-partnership"]);
  for (const ev of publicEvents) {
    if (ev.venue?.city?.trim()) citiesSet.add(ev.venue.city.trim());
    for (const s of ev.series ?? []) {
      if (s.trim()) seriesSet.add(s.trim());
    }
  }

  const categoryFilter = filters.category?.trim().toLowerCase();
  const domainFilter = filters.domain
    ? normalizeDomainSlug(filters.domain)
    : null;
  const cityFilter = filters.city?.trim().toLowerCase();
  const modeFilter = filters.mode?.trim().toLowerCase();
  const seriesFilter = filters.series?.trim().toLowerCase();

  const matchedEvents = publicEvents.filter((ev) => {
    if (categoryFilter && categoryFilter !== "all" && ev.category !== categoryFilter) {
      return false;
    }
    if (domainFilter && !ev.domains.includes(domainFilter)) {
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

  const fromDate = filters.from?.trim().slice(0, 10);
  const toDate = filters.to?.trim().slice(0, 10);

  const occurrences: ExpandedEventOccurrence[] = [];
  for (const ev of matchedEvents) {
    occurrences.push(...expandEventOccurrences(ev, fromDate, toDate));
  }

  occurrences.sort(
    (a, b) =>
      toEpochMs(a.occurrenceStart, false) - toEpochMs(b.occurrenceStart, false),
  );

  // Filter matchedEvents to those with at least one occurrence in [from, to] when range is provided
  const activeEventIds = new Set(occurrences.map((o) => o.id));
  const filteredEvents =
    fromDate || toDate
      ? matchedEvents.filter((e) => activeEventIds.has(e.id))
      : matchedEvents;

  filteredEvents.sort(
    (a, b) => toEpochMs(a.start, false) - toEpochMs(b.start, false),
  );

  return {
    events: filteredEvents,
    occurrences,
    cities: Array.from(citiesSet).sort(),
    seriesTags: Array.from(seriesSet).sort(),
  };
}

export async function loadAllEventsWithFallback(): Promise<{
  events: CetlsEvent[];
  source: "database" | "snapshot-fallback";
}> {
  try {
    const sql = await getSql();
    await ensureEventsSeeded(sql);
    const rows = await sql<RawEventRow>`
      select * from cetls_events order by start_iso asc, created_at asc
    `;
    return {
      events: rows.map(mapRowToEvent),
      source: "database",
    };
  } catch (err) {
    console.error("[events] Database unavailable, falling back to data/events.json:", err);
    return {
      events: getSeedEvents(),
      source: "snapshot-fallback",
    };
  }
}

export async function queryPublicEvents(filters: EventsFilterParams = {}) {
  const { events, source } = await loadAllEventsWithFallback();
  const filtered = applyEventsFilters(events, filters);
  return {
    ...filtered,
    timezone: "Asia/Kolkata",
    source,
  };
}

export async function getPublicEventBySlug(slug: string): Promise<CetlsEvent | null> {
  const cleanSlug = slug.trim().toLowerCase().replace(/\.ics$/i, "");
  const { events } = await loadAllEventsWithFallback();
  const found = events.find(
    (ev) =>
      ev.slug.toLowerCase() === cleanSlug &&
      !ev.deleted &&
      PUBLIC_EVENT_STATUSES.includes(ev.status),
  );
  return found ?? null;
}

async function insertAuditLog(
  sql: Sql,
  params: {
    eventId: string;
    eventSlug: string;
    actorEmail: string;
    action: string;
    diff: EventAuditDiff;
  },
): Promise<void> {
  await sql`
    insert into cetls_event_audit (
      event_id, event_slug, actor_email, action, diff_json, created_at
    ) values (
      ${params.eventId},
      ${params.eventSlug},
      ${params.actorEmail},
      ${params.action},
      ${JSON.stringify(params.diff)},
      ${nowIstIso()}
    )
  `;
}

export async function createEventRecord(
  actor: AuthenticatedEventActor,
  input: EventMutationInput,
): Promise<CetlsEvent> {
  assertWriteRateLimit(actor.email);
  // Per C3: Even if created by an admin, new events start as 'draft' or 'submitted' and require explicit Approve & Publish.
  const requestedStatus: EventStatus =
    input.status === "submitted" ? "submitted" : "draft";

  const validation = validateEventInput(
    { ...input, status: requestedStatus },
    { allowPublicStatus: false },
  );
  if (!validation.ok) {
    const err = new Error(validation.errors.join(" "));
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const payload = validation.data;
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const dup = await sql<{ id: string }>`
    select id from cetls_events where lower(slug) = ${payload.slug.toLowerCase()} limit 1
  `;
  if (dup.length > 0) {
    const err = new Error(`Slug '${payload.slug}' is already in use.`);
    (err as Error & { status?: number }).status = 409;
    throw err;
  }

  // If this is a single-occurrence override of a recurring parent event, add the date to the parent's exdates.
  if (payload.recurrenceParentId && payload.recurrenceOriginalDate) {
    const parentRows = await sql<RawEventRow>`
      select * from cetls_events where id = ${payload.recurrenceParentId} limit 1
    `;
    if (parentRows.length > 0) {
      const parentEv = mapRowToEvent(parentRows[0]);
      if (parentEv.recurrence?.rrule) {
        const nextExdates = Array.from(
          new Set([
            ...(parentEv.recurrence.exdates ?? []),
            payload.recurrenceOriginalDate.slice(0, 10),
          ]),
        );
        const nextRecurrence: EventRecurrence = {
          rrule: parentEv.recurrence.rrule,
          exdates: nextExdates,
        };
        await sql`
          update cetls_events
          set recurrence = ${JSON.stringify(nextRecurrence)},
              updated_by = ${actor.email},
              updated_at = ${nowIstIso()}
          where id = ${parentEv.id}
        `;
        await insertAuditLog(sql, {
          eventId: parentEv.id,
          eventSlug: parentEv.slug,
          actorEmail: actor.email,
          action: "occurrence_override",
          diff: {
            recurrence: {
              before: parentEv.recurrence,
              after: nextRecurrence,
            },
          },
        });
      }
    }
  }

  const id = randomUUID();
  const now = nowIstIso();

  await sql`
    insert into cetls_events (
      id, slug, title, summary, description, category, domains,
      start_iso, end_iso, all_day, timezone, recurrence,
      recurrence_parent_id, recurrence_original_date,
      mode, venue, online_url, access, series, partners, image,
      status, approved_by, approved_at, pending_fields, cancel_reason,
      links, deleted, created_by, created_at, updated_by, updated_at
    ) values (
      ${id},
      ${payload.slug},
      ${payload.title},
      ${payload.summary},
      ${payload.description},
      ${payload.category},
      ${JSON.stringify(payload.domains)},
      ${payload.start},
      ${payload.end},
      ${payload.allDay},
      ${payload.timezone},
      ${payload.recurrence ? JSON.stringify(payload.recurrence) : null},
      ${payload.recurrenceParentId},
      ${payload.recurrenceOriginalDate},
      ${payload.mode},
      ${JSON.stringify(payload.venue)},
      ${payload.onlineUrl},
      ${payload.access},
      ${JSON.stringify(payload.series)},
      ${JSON.stringify(payload.partners)},
      ${payload.image ? JSON.stringify(payload.image) : null},
      ${payload.status},
      ${null},
      ${null},
      ${JSON.stringify(payload.pendingFields)},
      ${payload.cancelReason},
      ${JSON.stringify(payload.links)},
      ${false},
      ${actor.email},
      ${now},
      ${actor.email},
      ${now}
    )
  `;

  const createdRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${id} limit 1
  `;
  const created = mapRowToEvent(createdRows[0]);

  await insertAuditLog(sql, {
    eventId: created.id,
    eventSlug: created.slug,
    actorEmail: actor.email,
    action: "create",
    diff: computeEventDiff(null, created),
  });

  return created;
}

export async function updateEventRecord(
  actor: AuthenticatedEventActor,
  eventId: string,
  input: Partial<EventMutationInput>,
): Promise<CetlsEvent> {
  assertWriteRateLimit(actor.email);
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const existingRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  if (existingRows.length === 0) {
    const err = new Error("Event not found.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const existing = mapRowToEvent(existingRows[0]);

  // Per C3 & Section 5: Edits to live events (published or pending) go back to 'submitted' for approval.
  const wasLive = existing.status === "published" || existing.status === "pending";
  const nextStatus: EventStatus = wasLive
    ? "submitted"
    : input.status === "submitted"
      ? "submitted"
      : existing.status === "submitted"
        ? "submitted"
        : "draft";

  const mergedInput: EventMutationInput = {
    slug: input.slug ?? existing.slug,
    title: input.title ?? existing.title,
    summary: input.summary ?? existing.summary,
    description:
      input.description !== undefined ? input.description : existing.description,
    category: input.category ?? existing.category,
    domains: input.domains ?? existing.domains,
    start: input.start ?? existing.start,
    end: input.end ?? existing.end,
    allDay: input.allDay ?? existing.allDay,
    timezone: "Asia/Kolkata",
    recurrence:
      input.recurrence !== undefined ? input.recurrence : existing.recurrence,
    recurrenceParentId:
      input.recurrenceParentId !== undefined
        ? input.recurrenceParentId
        : existing.recurrenceParentId,
    recurrenceOriginalDate:
      input.recurrenceOriginalDate !== undefined
        ? input.recurrenceOriginalDate
        : existing.recurrenceOriginalDate,
    mode: input.mode ?? existing.mode,
    venue: input.venue ?? existing.venue,
    onlineUrl:
      input.onlineUrl !== undefined ? input.onlineUrl : existing.onlineUrl,
    access: input.access ?? existing.access,
    series: input.series ?? existing.series,
    partners: input.partners ?? existing.partners,
    image: input.image !== undefined ? input.image : existing.image,
    status: nextStatus,
    pendingFields: input.pendingFields ?? existing.pendingFields,
    cancelReason:
      input.cancelReason !== undefined
        ? input.cancelReason
        : existing.cancelReason,
    links: input.links ?? existing.links,
  };

  const validation = validateEventInput(mergedInput, { allowPublicStatus: false });
  if (!validation.ok) {
    const err = new Error(validation.errors.join(" "));
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const payload = validation.data;
  if (payload.slug.toLowerCase() !== existing.slug.toLowerCase()) {
    const dup = await sql<{ id: string }>`
      select id from cetls_events where lower(slug) = ${payload.slug.toLowerCase()} and id != ${eventId} limit 1
    `;
    if (dup.length > 0) {
      const err = new Error(`Slug '${payload.slug}' is already in use.`);
      (err as Error & { status?: number }).status = 409;
      throw err;
    }
  }

  const now = nowIstIso();
  await sql`
    update cetls_events set
      slug = ${payload.slug},
      title = ${payload.title},
      summary = ${payload.summary},
      description = ${payload.description},
      category = ${payload.category},
      domains = ${JSON.stringify(payload.domains)},
      start_iso = ${payload.start},
      end_iso = ${payload.end},
      all_day = ${payload.allDay},
      recurrence = ${payload.recurrence ? JSON.stringify(payload.recurrence) : null},
      mode = ${JSON.stringify(payload.mode).replace(/^"|"$/g, "")},
      venue = ${JSON.stringify(payload.venue)},
      online_url = ${payload.onlineUrl},
      access = ${payload.access},
      series = ${JSON.stringify(payload.series)},
      partners = ${JSON.stringify(payload.partners)},
      image = ${payload.image ? JSON.stringify(payload.image) : null},
      status = ${payload.status},
      approved_by = ${null},
      approved_at = ${null},
      pending_fields = ${JSON.stringify(payload.pendingFields)},
      cancel_reason = ${payload.cancelReason},
      links = ${JSON.stringify(payload.links)},
      updated_by = ${actor.email},
      updated_at = ${now}
    where id = ${eventId}
  `;

  const updatedRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  const updated = mapRowToEvent(updatedRows[0]);

  await insertAuditLog(sql, {
    eventId: updated.id,
    eventSlug: updated.slug,
    actorEmail: actor.email,
    action: wasLive ? "update_sent_for_reapproval" : "update",
    diff: computeEventDiff(existing, updated),
  });

  return updated;
}

export async function submitEventForApproval(
  actor: AuthenticatedEventActor,
  eventId: string,
): Promise<CetlsEvent> {
  assertWriteRateLimit(actor.email);
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  if (rows.length === 0) {
    const err = new Error("Event not found.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const existing = mapRowToEvent(rows[0]);
  const now = nowIstIso();

  await sql`
    update cetls_events
    set status = 'submitted',
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${eventId}
  `;

  const updatedRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  const updated = mapRowToEvent(updatedRows[0]);

  await insertAuditLog(sql, {
    eventId: updated.id,
    eventSlug: updated.slug,
    actorEmail: actor.email,
    action: "submit",
    diff: computeEventDiff(existing, updated),
  });

  return updated;
}

export async function approveAndPublishEvent(
  actor: AuthenticatedEventActor,
  eventId: string,
  mode?: "published" | "pending",
): Promise<CetlsEvent> {
  if (actor.role !== "admin") {
    const err = new Error("Only admins can approve and publish events.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  assertWriteRateLimit(actor.email);
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  if (rows.length === 0) {
    const err = new Error("Event not found.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const existing = mapRowToEvent(rows[0]);

  // If the event has pendingFields or the admin explicitly chooses 'pending', publish as 'pending' (Tentative).
  const targetStatus: EventStatus =
    mode ?? (existing.pendingFields.length > 0 ? "pending" : "published");

  const validation = validateEventInput(
    {
      ...existing,
      status: targetStatus,
    },
    { allowPublicStatus: true },
  );
  if (!validation.ok) {
    const err = new Error(validation.errors.join(" "));
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const now = nowIstIso();
  await sql`
    update cetls_events
    set status = ${targetStatus},
        approved_by = ${actor.email},
        approved_at = ${now},
        cancel_reason = ${null},
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${eventId}
  `;

  const updatedRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  const updated = mapRowToEvent(updatedRows[0]);

  await insertAuditLog(sql, {
    eventId: updated.id,
    eventSlug: updated.slug,
    actorEmail: actor.email,
    action: "approve",
    diff: computeEventDiff(existing, updated),
  });

  return updated;
}

export async function duplicateEventAsDraft(
  actor: AuthenticatedEventActor,
  eventId: string,
): Promise<CetlsEvent> {
  assertWriteRateLimit(actor.email);
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  if (rows.length === 0) {
    const err = new Error("Event not found.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const source = mapRowToEvent(rows[0]);

  const baseSlug = `${source.slug}-copy`.slice(0, 70);
  let candidateSlug = baseSlug;
  let counter = 2;
  while (true) {
    const dup = await sql<{ id: string }>`
      select id from cetls_events where lower(slug) = ${candidateSlug} limit 1
    `;
    if (dup.length === 0) break;
    candidateSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const id = randomUUID();
  const now = nowIstIso();
  const copyTitle = `${source.title} (Copy)`.slice(0, 120);

  await sql`
    insert into cetls_events (
      id, slug, title, summary, description, category, domains,
      start_iso, end_iso, all_day, timezone, recurrence,
      recurrence_parent_id, recurrence_original_date,
      mode, venue, online_url, access, series, partners, image,
      status, approved_by, approved_at, pending_fields, cancel_reason,
      links, deleted, created_by, created_at, updated_by, updated_at
    ) values (
      ${id},
      ${candidateSlug},
      ${copyTitle},
      ${source.summary},
      ${source.description ?? null},
      ${source.category},
      ${JSON.stringify(source.domains)},
      ${source.start},
      ${source.end},
      ${source.allDay},
      ${source.timezone},
      ${source.recurrence ? JSON.stringify(source.recurrence) : null},
      ${null},
      ${null},
      ${source.mode},
      ${JSON.stringify(source.venue)},
      ${source.onlineUrl ?? null},
      ${source.access},
      ${JSON.stringify(source.series)},
      ${JSON.stringify(source.partners)},
      ${source.image ? JSON.stringify(source.image) : null},
      'draft',
      ${null},
      ${null},
      ${JSON.stringify(source.pendingFields)},
      ${null},
      ${JSON.stringify(source.links)},
      ${false},
      ${actor.email},
      ${now},
      ${actor.email},
      ${now}
    )
  `;

  const createdRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${id} limit 1
  `;
  const created = mapRowToEvent(createdRows[0]);

  await insertAuditLog(sql, {
    eventId: created.id,
    eventSlug: created.slug,
    actorEmail: actor.email,
    action: "duplicate",
    diff: computeEventDiff(null, created),
  });

  return created;
}

export async function cancelEventWithReason(
  actor: AuthenticatedEventActor,
  eventId: string,
  reason: string,
): Promise<CetlsEvent> {
  if (actor.role !== "admin") {
    const err = new Error("Only admins can cancel events.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  const cleanReason = reason.trim();
  if (!cleanReason) {
    const err = new Error("A cancellation reason is required.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  assertWriteRateLimit(actor.email);
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  if (rows.length === 0) {
    const err = new Error("Event not found.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const existing = mapRowToEvent(rows[0]);
  const now = nowIstIso();

  await sql`
    update cetls_events
    set status = 'cancelled',
        cancel_reason = ${cleanReason},
        approved_by = coalesce(approved_by, ${actor.email}),
        approved_at = coalesce(approved_at, ${now}),
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${eventId}
  `;

  const updatedRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  const updated = mapRowToEvent(updatedRows[0]);

  await insertAuditLog(sql, {
    eventId: updated.id,
    eventSlug: updated.slug,
    actorEmail: actor.email,
    action: "cancel",
    diff: computeEventDiff(existing, updated),
  });

  return updated;
}

export async function softDeleteOrPurgeEvent(
  actor: AuthenticatedEventActor,
  eventId: string,
  purge = false,
): Promise<{ deleted: boolean; purged: boolean }> {
  if (actor.role !== "admin") {
    const err = new Error("Only admins can delete or purge events.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  assertWriteRateLimit(actor.email);
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  if (rows.length === 0) {
    const err = new Error("Event not found.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const existing = mapRowToEvent(rows[0]);

  if (purge) {
    await sql`delete from cetls_events where id = ${eventId}`;
    await insertAuditLog(sql, {
      eventId: existing.id,
      eventSlug: existing.slug,
      actorEmail: actor.email,
      action: "purge",
      diff: { deleted: { before: existing.deleted, after: "PURGED" } },
    });
    return { deleted: true, purged: true };
  }

  const now = nowIstIso();
  await sql`
    update cetls_events
    set deleted = true,
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${eventId}
  `;

  const updatedRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  const updated = mapRowToEvent(updatedRows[0]);

  await insertAuditLog(sql, {
    eventId: updated.id,
    eventSlug: updated.slug,
    actorEmail: actor.email,
    action: "soft_delete",
    diff: computeEventDiff(existing, updated),
  });

  return { deleted: true, purged: false };
}

export async function restoreSoftDeletedEvent(
  actor: AuthenticatedEventActor,
  eventId: string,
): Promise<CetlsEvent> {
  if (actor.role !== "admin") {
    const err = new Error("Only admins can restore deleted events.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  assertWriteRateLimit(actor.email);
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  if (rows.length === 0) {
    const err = new Error("Event not found.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const existing = mapRowToEvent(rows[0]);
  const now = nowIstIso();

  await sql`
    update cetls_events
    set deleted = false,
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${eventId}
  `;

  const updatedRows = await sql<RawEventRow>`
    select * from cetls_events where id = ${eventId} limit 1
  `;
  const updated = mapRowToEvent(updatedRows[0]);

  await insertAuditLog(sql, {
    eventId: updated.id,
    eventSlug: updated.slug,
    actorEmail: actor.email,
    action: "restore",
    diff: computeEventDiff(existing, updated),
  });

  return updated;
}

export async function listAdminEvents(
  actor: AuthenticatedEventActor,
): Promise<CetlsEvent[]> {
  const sql = await getSql();
  await ensureEventsSeeded(sql);
  const rows = await sql<RawEventRow>`
    select * from cetls_events order by start_iso desc, updated_at desc
  `;
  const all = rows.map(mapRowToEvent);
  return actor.role === "admin" ? all : all.filter((e) => !e.deleted);
}

export async function queryAuditLogs(
  actor: AuthenticatedEventActor,
  eventId?: string,
): Promise<EventAuditEntry[]> {
  if (actor.role !== "admin") {
    const err = new Error("Only admins can view the audit log.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  const rows = eventId
    ? await sql<RawAuditRow>`
        select id, event_id, event_slug, actor_email, action, diff_json, created_at
        from cetls_event_audit
        where event_id = ${eventId}
        order by id desc
        limit 250
      `
    : await sql<RawAuditRow>`
        select id, event_id, event_slug, actor_email, action, diff_json, created_at
        from cetls_event_audit
        order by id desc
        limit 250
      `;

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    eventSlug: r.event_slug,
    actorEmail: r.actor_email,
    action: r.action,
    diff: safeParseJson<EventAuditDiff>(
      r.diff_json,
      {},
    ),
    createdAt: r.created_at,
  }));
}

export async function listAllowlistUsers(
  actor: AuthenticatedEventActor,
): Promise<EventUserRecord[]> {
  const sql = await getSql();
  await ensureEventsSeeded(sql);
  const rows = await sql<RawUserRow>`
    select email, name, role, added_by, created_at
    from cetls_event_users
    order by role asc, email asc
  `;
  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    role: (r.role === "admin" ? "admin" : "editor") as EventUserRole,
    addedBy: r.added_by,
    createdAt: String(r.created_at),
  }));
}

export async function upsertAllowlistUser(
  actor: AuthenticatedEventActor,
  input: { email: string; name: string; role: EventUserRole },
): Promise<EventUserRecord[]> {
  if (actor.role !== "admin") {
    const err = new Error("Only admins can manage allowlisted users.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  assertWriteRateLimit(actor.email);
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split("@")[0];
  if (!email || !email.includes("@")) {
    const err = new Error("Valid email address is required.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  if (input.role !== "admin" && input.role !== "editor") {
    const err = new Error("Role must be 'admin' or 'editor'.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const sql = await getSql();
  await ensureEventsSeeded(sql);

  await sql`
    insert into cetls_event_users (email, name, role, added_by, updated_at)
    values (${email}, ${name}, ${input.role}, ${actor.email}, now())
    on conflict (email) do update set
      name = excluded.name,
      role = excluded.role,
      updated_at = now()
  `;

  return listAllowlistUsers(actor);
}

export async function removeAllowlistUser(
  actor: AuthenticatedEventActor,
  targetEmail: string,
): Promise<EventUserRecord[]> {
  if (actor.role !== "admin") {
    const err = new Error("Only admins can remove allowlisted users.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  const clean = targetEmail.trim().toLowerCase();
  if (clean === actor.email.toLowerCase()) {
    const err = new Error("You cannot remove your own admin account.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const sql = await getSql();
  await ensureEventsSeeded(sql);
  await sql`delete from cetls_event_users where lower(email) = ${clean}`;
  return listAllowlistUsers(actor);
}

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export async function saveUploadedImage(
  actor: AuthenticatedEventActor,
  input: {
    mimeType: string;
    altText: string;
    dataBase64: string;
    sizeBytes: number;
  },
): Promise<{ url: string; alt: string; id: string }> {
  assertWriteRateLimit(actor.email);
  const mime = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(mime)) {
    const err = new Error("Invalid image format. Only JPG, PNG, and WebP are allowed.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const alt = input.altText.trim();
  if (!alt) {
    const err = new Error("Alt text is required when uploading an image.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const rawBase64 = input.dataBase64.replace(/^data:[^;]+;base64,/, "").trim();
  const byteLength = Buffer.from(rawBase64, "base64").byteLength;
  if (byteLength === 0 || byteLength > MAX_UPLOAD_BYTES) {
    const err = new Error("Image size must be between 1 byte and 2 MB.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const id = randomUUID();
  const sql = await getSql();
  await ensureEventsSeeded(sql);

  await sql`
    insert into cetls_event_uploads (id, mime_type, alt_text, data_base64, size_bytes, uploaded_by)
    values (${id}, ${mime}, ${alt}, ${rawBase64}, ${byteLength}, ${actor.email})
  `;

  return {
    id,
    url: `/api/uploads/${id}`,
    alt,
  };
}

export async function getUploadedImageById(
  id: string,
): Promise<{ mimeType: string; altText: string; buffer: Buffer } | null> {
  const sql = await getSql();
  const rows = await sql<{
    mime_type: string;
    alt_text: string;
    data_base64: string;
  }>`
    select mime_type, alt_text, data_base64
    from cetls_event_uploads
    where id = ${id}
    limit 1
  `;
  if (rows.length === 0) return null;
  return {
    mimeType: rows[0].mime_type,
    altText: rows[0].alt_text,
    buffer: Buffer.from(rows[0].data_base64, "base64"),
  };
}

export { getIstParts };
