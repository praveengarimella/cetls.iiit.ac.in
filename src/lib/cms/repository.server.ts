import { getSql, type Sql } from "@/lib/db";
import { nowIstIso } from "@/lib/events/ist-date";
import type { EventUserRole } from "@/lib/events/types";
import { defaultSiteData } from "@/lib/site-data";
import type { SiteData } from "@/lib/site-data.types";
import type {
  CmsDashboardState,
  SiteContentAuditEntry,
  SiteRevisionRecord,
  SiteRevisionStatus,
} from "./types";

interface RawRevisionRow {
  id: number;
  version_number: number;
  status: string;
  title: string;
  change_summary: string;
  content_json: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  published_by: string | null;
  published_at: string | null;
}

interface RawAuditRow {
  id: number;
  revision_id: number;
  actor_email: string;
  action: string;
  note: string;
  created_at: string;
}

export interface CmsActor {
  userId: string;
  email: string;
  name: string;
  role: EventUserRole;
}

function validateSiteDataShape(content: unknown): SiteData {
  if (!content || typeof content !== "object") {
    throw new Error("Site content must be a JSON object.");
  }
  const obj = content as Record<string, unknown>;
  const requiredObjectKeys = ["org", "site", "roadmap", "programmes", "news"];
  for (const key of requiredObjectKeys) {
    if (!obj[key] || typeof obj[key] !== "object") {
      throw new Error(`Missing or invalid '${key}' section in site content.`);
    }
  }
  const requiredArrayKeys = ["pages", "people", "groups", "domains", "researchQuestions"];
  for (const key of requiredArrayKeys) {
    if (!Array.isArray(obj[key])) {
      throw new Error(`Missing or invalid '${key}' array in site content.`);
    }
  }
  return content as SiteData;
}

function mapRevisionRow(row: RawRevisionRow): SiteRevisionRecord {
  let parsed: SiteData = defaultSiteData;
  try {
    parsed = JSON.parse(row.content_json) as SiteData;
  } catch {
    parsed = defaultSiteData;
  }
  return {
    id: Number(row.id),
    versionNumber: Number(row.version_number),
    status: row.status as SiteRevisionStatus,
    title: row.title,
    changeSummary: row.change_summary,
    content: parsed,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
  };
}

function mapAuditRow(row: RawAuditRow): SiteContentAuditEntry {
  return {
    id: Number(row.id),
    revisionId: Number(row.revision_id),
    actorEmail: row.actor_email,
    action: row.action,
    note: row.note,
    createdAt: row.created_at,
  };
}

async function recordAudit(
  sql: Sql,
  revisionId: number,
  actorEmail: string,
  action: string,
  note = "",
): Promise<void> {
  await sql`
    insert into cetls_site_content_audit (revision_id, actor_email, action, note, created_at)
    values (${revisionId}, ${actorEmail}, ${action}, ${note}, ${nowIstIso()})
  `;
}

export async function ensureInitialPublishedRevision(sql: Sql): Promise<void> {
  const existing = await sql<{ id: number; version_number: number; created_by: string; status: string }>`
    select id, version_number, created_by, status from cetls_site_revisions order by id asc limit 2
  `;
  if (existing.length > 0) {
    if (
      existing.length === 1 &&
      existing[0].version_number === 1 &&
      existing[0].created_by === "system" &&
      existing[0].status === "published"
    ) {
      await sql`
        update cetls_site_revisions
        set content_json = ${JSON.stringify(defaultSiteData)}
        where id = ${existing[0].id}
      `;
    }
    return;
  }

  const now = nowIstIso();
  const inserted = await sql<{ id: number }>`
    insert into cetls_site_revisions (
      version_number, status, title, change_summary, content_json,
      created_by, created_at, updated_by, updated_at,
      reviewed_by, reviewed_at, published_by, published_at
    ) values (
      1,
      'published',
      'Initial baseline from site-data.json',
      'Seeded from repository snapshot',
      ${JSON.stringify(defaultSiteData)},
      'system',
      ${now},
      'system',
      ${now},
      'system',
      ${now},
      'system',
      ${now}
    )
    returning id
  `;
  if (inserted[0]?.id) {
    await recordAudit(sql, inserted[0].id, "system", "seed_published", "Initial baseline seeded");
  }
}

export async function getPublishedSiteData(): Promise<SiteData> {
  try {
    const sql = await getSql();
    await ensureInitialPublishedRevision(sql);
    const rows = await sql<{ content_json: string }>`
      select content_json
      from cetls_site_revisions
      where status = 'published'
      order by id desc
      limit 1
    `;
    const raw = rows[0]?.content_json;
    if (!raw) return defaultSiteData;
    return validateSiteDataShape(JSON.parse(raw));
  } catch {
    return defaultSiteData;
  }
}

export async function getCmsDashboard(actor: CmsActor): Promise<CmsDashboardState> {
  const sql = await getSql();
  await ensureInitialPublishedRevision(sql);

  const revRows = await sql<RawRevisionRow>`
    select * from cetls_site_revisions
    order by id desc
  `;

  const auditRows =
    actor.role === "admin"
      ? await sql<RawAuditRow>`
          select * from cetls_site_content_audit
          order by id desc
          limit 200
        `
      : await sql<RawAuditRow>`
          select * from cetls_site_content_audit
          order by id desc
          limit 50
        `;

  return {
    revisions: revRows.map(mapRevisionRow),
    auditLogs: auditRows.map(mapAuditRow),
  };
}

export async function createSiteDraft(
  actor: CmsActor,
  input: { title?: string; changeSummary?: string; baseRevisionId?: number },
): Promise<SiteRevisionRecord> {
  const sql = await getSql();
  await ensureInitialPublishedRevision(sql);

  let baseContent = defaultSiteData;
  if (input.baseRevisionId) {
    const baseRows = await sql<{ content_json: string }>`
      select content_json from cetls_site_revisions where id = ${input.baseRevisionId} limit 1
    `;
    if (baseRows[0]?.content_json) {
      baseContent = JSON.parse(baseRows[0].content_json) as SiteData;
    }
  } else {
    const pubRows = await sql<{ content_json: string }>`
      select content_json from cetls_site_revisions where status = 'published' order by id desc limit 1
    `;
    if (pubRows[0]?.content_json) {
      baseContent = JSON.parse(pubRows[0].content_json) as SiteData;
    }
  }

  const maxRows = await sql<{ max_v: number }>`
    select coalesce(max(version_number), 0)::int as max_v from cetls_site_revisions
  `;
  const nextVersion = (maxRows[0]?.max_v ?? 0) + 1;
  const now = nowIstIso();
  const title = (input.title || `Draft v${nextVersion}`).trim();
  const changeSummary = (input.changeSummary || "").trim();

  const inserted = await sql<RawRevisionRow>`
    insert into cetls_site_revisions (
      version_number, status, title, change_summary, content_json,
      created_by, created_at, updated_by, updated_at
    ) values (
      ${nextVersion},
      'draft',
      ${title},
      ${changeSummary},
      ${JSON.stringify(baseContent)},
      ${actor.email},
      ${now},
      ${actor.email},
      ${now}
    )
    returning *
  `;
  const rev = mapRevisionRow(inserted[0]);
  await recordAudit(sql, rev.id, actor.email, "create_draft", title);
  return rev;
}

export async function saveSiteDraft(
  actor: CmsActor,
  input: {
    revisionId: number;
    title: string;
    changeSummary: string;
    content: SiteData;
  },
): Promise<SiteRevisionRecord> {
  const sql = await getSql();
  const validated = validateSiteDataShape(input.content);

  const existingRows = await sql<RawRevisionRow>`
    select * from cetls_site_revisions where id = ${input.revisionId} limit 1
  `;
  const existing = existingRows[0];
  if (!existing) throw new Error("Revision not found.");
  if (existing.status !== "draft") {
    throw new Error("Only draft revisions can be edited directly. Return to draft or create a new draft.");
  }

  const now = nowIstIso();
  const title = input.title.trim() || existing.title;
  const changeSummary = input.changeSummary.trim();

  const updated = await sql<RawRevisionRow>`
    update cetls_site_revisions
    set title = ${title},
        change_summary = ${changeSummary},
        content_json = ${JSON.stringify(validated)},
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${input.revisionId}
    returning *
  `;
  const rev = mapRevisionRow(updated[0]);
  await recordAudit(sql, rev.id, actor.email, "save_draft", changeSummary || title);
  return rev;
}

export async function submitSiteRevisionForReview(
  actor: CmsActor,
  input: { revisionId: number; changeSummary?: string },
): Promise<SiteRevisionRecord> {
  const sql = await getSql();
  const existingRows = await sql<RawRevisionRow>`
    select * from cetls_site_revisions where id = ${input.revisionId} limit 1
  `;
  const existing = existingRows[0];
  if (!existing) throw new Error("Revision not found.");
  if (existing.status !== "draft") {
    throw new Error("Only draft revisions can be submitted for review.");
  }

  const now = nowIstIso();
  const changeSummary =
    input.changeSummary !== undefined ? input.changeSummary.trim() : existing.change_summary;

  const updated = await sql<RawRevisionRow>`
    update cetls_site_revisions
    set status = 'in_review',
        change_summary = ${changeSummary},
        submitted_by = ${actor.email},
        submitted_at = ${now},
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${input.revisionId}
    returning *
  `;
  const rev = mapRevisionRow(updated[0]);
  await recordAudit(sql, rev.id, actor.email, "submit_review", changeSummary || rev.title);
  return rev;
}

export async function requestSiteRevisionChanges(
  actor: CmsActor,
  input: { revisionId: number; reviewNote: string },
): Promise<SiteRevisionRecord> {
  if (actor.role !== "admin") {
    throw new Error("Only admins can review and request changes.");
  }
  const sql = await getSql();
  const existingRows = await sql<RawRevisionRow>`
    select * from cetls_site_revisions where id = ${input.revisionId} limit 1
  `;
  const existing = existingRows[0];
  if (!existing) throw new Error("Revision not found.");
  if (existing.status !== "in_review") {
    throw new Error("Only revisions in review can be returned for changes.");
  }

  const now = nowIstIso();
  const note = input.reviewNote.trim() || "Changes requested by reviewer.";
  const updated = await sql<RawRevisionRow>`
    update cetls_site_revisions
    set status = 'draft',
        reviewed_by = ${actor.email},
        reviewed_at = ${now},
        review_note = ${note},
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${input.revisionId}
    returning *
  `;
  const rev = mapRevisionRow(updated[0]);
  await recordAudit(sql, rev.id, actor.email, "request_changes", note);
  return rev;
}

export async function publishSiteRevision(
  actor: CmsActor,
  input: { revisionId: number; reviewNote?: string },
): Promise<SiteRevisionRecord> {
  if (actor.role !== "admin") {
    throw new Error("Only admins can approve and publish site revisions.");
  }
  const sql = await getSql();
  const existingRows = await sql<RawRevisionRow>`
    select * from cetls_site_revisions where id = ${input.revisionId} limit 1
  `;
  const existing = existingRows[0];
  if (!existing) throw new Error("Revision not found.");
  if (existing.status !== "in_review" && existing.status !== "draft") {
    throw new Error("Only draft or in-review revisions can be published.");
  }

  validateSiteDataShape(JSON.parse(existing.content_json));

  const now = nowIstIso();
  const note = (input.reviewNote || "").trim();

  await sql`
    update cetls_site_revisions
    set status = 'archived',
        updated_by = ${actor.email},
        updated_at = ${now}
    where status = 'published' and id <> ${input.revisionId}
  `;

  const updated = await sql<RawRevisionRow>`
    update cetls_site_revisions
    set status = 'published',
        reviewed_by = ${actor.email},
        reviewed_at = ${now},
        review_note = ${note || existing.review_note},
        published_by = ${actor.email},
        published_at = ${now},
        updated_by = ${actor.email},
        updated_at = ${now}
    where id = ${input.revisionId}
    returning *
  `;
  const rev = mapRevisionRow(updated[0]);
  await recordAudit(sql, rev.id, actor.email, "publish", note || `Published v${rev.versionNumber}`);
  return rev;
}

export async function rollbackSiteRevision(
  actor: CmsActor,
  input: { revisionId: number },
): Promise<SiteRevisionRecord> {
  if (actor.role !== "admin") {
    throw new Error("Only admins can roll back to an archived revision.");
  }
  const sql = await getSql();
  const targetRows = await sql<RawRevisionRow>`
    select * from cetls_site_revisions where id = ${input.revisionId} limit 1
  `;
  const target = targetRows[0];
  if (!target) throw new Error("Target revision not found.");

  const maxRows = await sql<{ max_v: number }>`
    select coalesce(max(version_number), 0)::int as max_v from cetls_site_revisions
  `;
  const nextVersion = (maxRows[0]?.max_v ?? 0) + 1;
  const now = nowIstIso();

  await sql`
    update cetls_site_revisions
    set status = 'archived',
        updated_by = ${actor.email},
        updated_at = ${now}
    where status = 'published'
  `;

  const inserted = await sql<RawRevisionRow>`
    insert into cetls_site_revisions (
      version_number, status, title, change_summary, content_json,
      created_by, created_at, updated_by, updated_at,
      reviewed_by, reviewed_at, review_note, published_by, published_at
    ) values (
      ${nextVersion},
      'published',
      ${`Rollback to v${target.version_number} (${target.title})`},
      ${`Rolled back to version ${target.version_number}`},
      ${target.content_json},
      ${actor.email},
      ${now},
      ${actor.email},
      ${now},
      ${actor.email},
      ${now},
      ${`Rollback from v${target.version_number}`},
      ${actor.email},
      ${now}
    )
    returning *
  `;
  const rev = mapRevisionRow(inserted[0]);
  await recordAudit(sql, rev.id, actor.email, "rollback", `Rolled back to v${target.version_number}`);
  return rev;
}

export async function discardSiteDraft(
  actor: CmsActor,
  input: { revisionId: number },
): Promise<void> {
  const sql = await getSql();
  const existingRows = await sql<RawRevisionRow>`
    select * from cetls_site_revisions where id = ${input.revisionId} limit 1
  `;
  const existing = existingRows[0];
  if (!existing) throw new Error("Revision not found.");
  if (existing.status !== "draft") {
    throw new Error("Only draft revisions can be discarded.");
  }
  if (actor.role !== "admin" && existing.created_by !== actor.email) {
    throw new Error("Only admins or the draft creator can discard this draft.");
  }

  await sql`delete from cetls_site_revisions where id = ${input.revisionId}`;
  await recordAudit(sql, input.revisionId, actor.email, "discard_draft", existing.title);
}
