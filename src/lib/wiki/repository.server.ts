import { getSql, type Sql } from "@/lib/db";
import { nowIstIso } from "@/lib/events/ist-date";
import type { EventUserRole } from "@/lib/events/types";
import { getBuiltInSeedWikiPages, getSeedWikiPageBySlug } from "./seed-markdown";
import type {
  WikiPagePayload,
  WikiPageSummary,
  WikiRevisionRecord,
  WikiRevisionStatus,
} from "./types";

export interface WikiActor {
  userId: string;
  email: string;
  name: string;
  role: EventUserRole;
}

interface RawPageRow {
  slug: string;
  path: string;
  title: string;
  is_custom: boolean;
  published_rev_id: number | null;
  updated_at: string;
}

interface RawRevRow {
  id: number;
  page_slug: string;
  rev_number: number;
  status: string;
  title: string;
  markdown: string;
  edit_summary: string;
  author_email: string;
  created_at: string;
  updated_at: string;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

function mapRev(row: RawRevRow): WikiRevisionRecord {
  return {
    id: Number(row.id),
    pageSlug: row.page_slug,
    revNumber: Number(row.rev_number),
    status: row.status as WikiRevisionStatus,
    title: row.title,
    markdown: row.markdown,
    editSummary: row.edit_summary,
    authorEmail: row.author_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

export async function ensureWikiPagesSeeded(sql: Sql): Promise<void> {
  const seeds = getBuiltInSeedWikiPages();
  const existing = await sql<{ slug: string }>`
    select slug from cetls_wiki_pages
  `;
  const existingSet = new Set(existing.map((r) => r.slug));
  const now = nowIstIso();

  for (const seed of seeds) {
    if (existingSet.has(seed.slug)) continue;

    await sql`
      insert into cetls_wiki_pages (slug, path, title, is_custom, updated_at)
      values (${seed.slug}, ${seed.path}, ${seed.title}, false, ${now})
      on conflict (slug) do nothing
    `;

    const inserted = await sql<{ id: number }>`
      insert into cetls_wiki_revisions (
        page_slug, rev_number, status, title, markdown, edit_summary,
        author_email, created_at, updated_at, reviewed_by, reviewed_at
      ) values (
        ${seed.slug},
        1,
        'published',
        ${seed.title},
        ${seed.markdown},
        'Initial page seeded from site content',
        'system',
        ${now},
        ${now},
        'system',
        ${now}
      )
      returning id
    `;

    if (inserted[0]?.id) {
      await sql`
        update cetls_wiki_pages
        set published_rev_id = ${inserted[0].id}
        where slug = ${seed.slug}
      `;
    }
  }
}

function fallbackPayload(slug: string): WikiPagePayload | null {
  const seed = getSeedWikiPageBySlug(slug);
  if (!seed) return null;
  const now = nowIstIso();
  return {
    slug: seed.slug,
    path: seed.path,
    title: seed.title,
    isCustom: false,
    published: {
      id: 0,
      pageSlug: seed.slug,
      revNumber: 1,
      status: "published",
      title: seed.title,
      markdown: seed.markdown,
      editSummary: "Initial baseline",
      authorEmail: "system",
      createdAt: now,
      updatedAt: now,
      submittedBy: null,
      submittedAt: null,
      reviewedBy: "system",
      reviewedAt: now,
      reviewNote: null,
    },
    actor: null,
    workingDraft: null,
    revisions: [],
  };
}

export async function getWikiPagePayload(
  slug: string,
  actor: WikiActor | null,
): Promise<WikiPagePayload | null> {
  try {
    const sql = await getSql();
    await ensureWikiPagesSeeded(sql);

    const pageRows = await sql<RawPageRow>`
      select * from cetls_wiki_pages where slug = ${slug} limit 1
    `;
    const page = pageRows[0];
    if (!page) return fallbackPayload(slug);

    const allRevsRows = await sql<RawRevRow>`
      select * from cetls_wiki_revisions
      where page_slug = ${slug}
      order by rev_number desc, id desc
    `;
    const allRevs = allRevsRows.map(mapRev);
    const published =
      allRevs.find((r) => r.status === "published") ??
      allRevs[allRevs.length - 1];

    if (!published) return fallbackPayload(slug);

    if (!actor) {
      // Public view: hide unapproved custom pages that have no published rev
      if (page.is_custom && published.status !== "published") {
        return null;
      }
      return {
        slug: page.slug,
        path: page.path,
        title: published.title,
        isCustom: Boolean(page.is_custom),
        published,
        actor: null,
        workingDraft: null,
        revisions: [],
      };
    }

    const workingDraft =
      allRevs.find((r) => r.status === "in_review") ??
      allRevs.find((r) => r.status === "draft") ??
      null;

    return {
      slug: page.slug,
      path: page.path,
      title: published.title,
      isCustom: Boolean(page.is_custom),
      published,
      actor: {
        email: actor.email,
        name: actor.name,
        role: actor.role,
      },
      workingDraft,
      revisions: allRevs,
    };
  } catch {
    return fallbackPayload(slug);
  }
}

export async function listWikiPagesDirectory(): Promise<WikiPageSummary[]> {
  const sql = await getSql();
  await ensureWikiPagesSeeded(sql);

  const pages = await sql<RawPageRow>`
    select * from cetls_wiki_pages order by is_custom asc, path asc
  `;
  const revs = await sql<RawRevRow>`
    select * from cetls_wiki_revisions order by rev_number desc, id desc
  `;

  const revsBySlug = new Map<string, WikiRevisionRecord[]>();
  for (const raw of revs) {
    const mapped = mapRev(raw);
    const arr = revsBySlug.get(mapped.pageSlug) ?? [];
    arr.push(mapped);
    revsBySlug.set(mapped.pageSlug, arr);
  }

  return pages.map((p) => {
    const list = revsBySlug.get(p.slug) ?? [];
    const pub = list.find((r) => r.status === "published") ?? null;
    const pending =
      list.find((r) => r.status === "in_review") ??
      list.find((r) => r.status === "draft") ??
      null;

    return {
      slug: p.slug,
      path: p.path,
      title: pub?.title ?? p.title,
      isCustom: Boolean(p.is_custom),
      updatedAt: p.updated_at,
      publishedRevNumber: pub?.revNumber ?? null,
      publishedBy: pub?.reviewedBy ?? pub?.authorEmail ?? null,
      pendingRevision: pending
        ? {
            id: pending.id,
            revNumber: pending.revNumber,
            status: pending.status as "draft" | "in_review",
            authorEmail: pending.authorEmail,
            editSummary: pending.editSummary,
            updatedAt: pending.updatedAt,
          }
        : null,
    };
  });
}

async function nextRevNumber(sql: Sql, pageSlug: string): Promise<number> {
  const rows = await sql<{ max_rev: number }>`
    select coalesce(max(rev_number), 0)::int as max_rev
    from cetls_wiki_revisions
    where page_slug = ${pageSlug}
  `;
  return (rows[0]?.max_rev ?? 0) + 1;
}

export async function saveWikiDraft(
  actor: WikiActor,
  input: {
    pageSlug: string;
    title: string;
    markdown: string;
    editSummary: string;
  },
): Promise<WikiRevisionRecord> {
  const sql = await getSql();
  await ensureWikiPagesSeeded(sql);

  const title = input.title.trim();
  const markdown = input.markdown;
  const summary = input.editSummary.trim();
  if (!title || !markdown.trim()) {
    throw new Error("Page title and Markdown body cannot be empty.");
  }

  const now = nowIstIso();
  const existingDraft = await sql<RawRevRow>`
    select * from cetls_wiki_revisions
    where page_slug = ${input.pageSlug} and status = 'draft'
    order by id desc limit 1
  `;

  if (existingDraft[0]) {
    const updated = await sql<RawRevRow>`
      update cetls_wiki_revisions
      set title = ${title},
          markdown = ${markdown},
          edit_summary = ${summary},
          author_email = ${actor.email},
          updated_at = ${now}
      where id = ${existingDraft[0].id}
      returning *
    `;
    await sql`update cetls_wiki_pages set updated_at = ${now} where slug = ${input.pageSlug}`;
    return mapRev(updated[0]);
  }

  const revNo = await nextRevNumber(sql, input.pageSlug);
  const inserted = await sql<RawRevRow>`
    insert into cetls_wiki_revisions (
      page_slug, rev_number, status, title, markdown, edit_summary,
      author_email, created_at, updated_at
    ) values (
      ${input.pageSlug},
      ${revNo},
      'draft',
      ${title},
      ${markdown},
      ${summary},
      ${actor.email},
      ${now},
      ${now}
    )
    returning *
  `;
  await sql`update cetls_wiki_pages set updated_at = ${now} where slug = ${input.pageSlug}`;
  return mapRev(inserted[0]);
}

export async function submitWikiForReview(
  actor: WikiActor,
  input: {
    pageSlug: string;
    title: string;
    markdown: string;
    editSummary: string;
  },
): Promise<WikiRevisionRecord> {
  const sql = await getSql();
  const draft = await saveWikiDraft(actor, input);
  const now = nowIstIso();
  const summary = input.editSummary.trim() || "Submitted for review";

  const updated = await sql<RawRevRow>`
    update cetls_wiki_revisions
    set status = 'in_review',
        edit_summary = ${summary},
        submitted_by = ${actor.email},
        submitted_at = ${now},
        updated_at = ${now}
    where id = ${draft.id}
    returning *
  `;
  await sql`update cetls_wiki_pages set updated_at = ${now} where slug = ${input.pageSlug}`;
  return mapRev(updated[0]);
}

export async function requestWikiChanges(
  actor: WikiActor,
  input: { revisionId: number; reviewNote: string },
): Promise<WikiRevisionRecord> {
  if (actor.role !== "admin") {
    throw new Error("Only admins can return a revision for changes.");
  }
  const sql = await getSql();
  const now = nowIstIso();
  const note = input.reviewNote.trim() || "Changes requested by reviewer.";

  const updated = await sql<RawRevRow>`
    update cetls_wiki_revisions
    set status = 'draft',
        reviewed_by = ${actor.email},
        reviewed_at = ${now},
        review_note = ${note},
        updated_at = ${now}
    where id = ${input.revisionId}
    returning *
  `;
  if (!updated[0]) throw new Error("Revision not found.");
  return mapRev(updated[0]);
}

export async function publishWikiRevision(
  actor: WikiActor,
  input: {
    pageSlug: string;
    revisionId?: number;
    title?: string;
    markdown?: string;
    editSummary?: string;
    reviewNote?: string;
  },
): Promise<WikiRevisionRecord> {
  if (actor.role !== "admin") {
    throw new Error("Only admins can approve and publish revisions.");
  }
  const sql = await getSql();
  await ensureWikiPagesSeeded(sql);
  const now = nowIstIso();

  let targetRevId = input.revisionId;
  if (!targetRevId && input.markdown !== undefined && input.title !== undefined) {
    const saved = await saveWikiDraft(actor, {
      pageSlug: input.pageSlug,
      title: input.title,
      markdown: input.markdown,
      editSummary: input.editSummary || "Direct admin publish",
    });
    targetRevId = saved.id;
  }

  if (!targetRevId) {
    throw new Error("No revision specified to publish.");
  }

  await sql`
    update cetls_wiki_revisions
    set status = 'archived', updated_at = ${now}
    where page_slug = ${input.pageSlug} and status = 'published' and id <> ${targetRevId}
  `;

  const updated = await sql<RawRevRow>`
    update cetls_wiki_revisions
    set status = 'published',
        reviewed_by = ${actor.email},
        reviewed_at = ${now},
        review_note = ${input.reviewNote?.trim() || null},
        updated_at = ${now}
    where id = ${targetRevId}
    returning *
  `;
  const published = updated[0];
  if (!published) throw new Error("Revision not found.");

  await sql`
    update cetls_wiki_pages
    set title = ${published.title},
        published_rev_id = ${published.id},
        updated_at = ${now}
    where slug = ${input.pageSlug}
  `;

  return mapRev(published);
}

export async function revertWikiPageToRevision(
  actor: WikiActor,
  input: { pageSlug: string; targetRevisionId: number },
): Promise<WikiRevisionRecord> {
  if (actor.role !== "admin") {
    throw new Error("Only admins can revert to an earlier revision.");
  }
  const sql = await getSql();
  const targetRows = await sql<RawRevRow>`
    select * from cetls_wiki_revisions
    where id = ${input.targetRevisionId} and page_slug = ${input.pageSlug}
    limit 1
  `;
  const target = targetRows[0];
  if (!target) throw new Error("Target revision not found.");

  const now = nowIstIso();
  const revNo = await nextRevNumber(sql, input.pageSlug);

  await sql`
    update cetls_wiki_revisions
    set status = 'archived', updated_at = ${now}
    where page_slug = ${input.pageSlug} and status = 'published'
  `;

  const inserted = await sql<RawRevRow>`
    insert into cetls_wiki_revisions (
      page_slug, rev_number, status, title, markdown, edit_summary,
      author_email, created_at, updated_at, reviewed_by, reviewed_at
    ) values (
      ${input.pageSlug},
      ${revNo},
      'published',
      ${target.title},
      ${target.markdown},
      ${`Reverted to v${target.rev_number} (${target.edit_summary || "earlier version"})`},
      ${actor.email},
      ${now},
      ${now},
      ${actor.email},
      ${now}
    )
    returning *
  `;
  const rev = mapRev(inserted[0]);
  await sql`
    update cetls_wiki_pages
    set title = ${rev.title},
        published_rev_id = ${rev.id},
        updated_at = ${now}
    where slug = ${input.pageSlug}
  `;
  return rev;
}

export async function discardWikiDraft(
  actor: WikiActor,
  input: { revisionId: number },
): Promise<void> {
  const sql = await getSql();
  const rows = await sql<RawRevRow>`
    select * from cetls_wiki_revisions where id = ${input.revisionId} limit 1
  `;
  const rev = rows[0];
  if (!rev) return;
  if (rev.status !== "draft") {
    throw new Error("Only draft revisions can be discarded.");
  }
  if (actor.role !== "admin" && rev.author_email !== actor.email) {
    throw new Error("Only admins or the draft author can discard this draft.");
  }
  await sql`delete from cetls_wiki_revisions where id = ${input.revisionId}`;
}

export async function createCustomWikiPage(
  actor: WikiActor,
  input: { slug: string; title: string; markdown: string },
): Promise<{ slug: string; path: string }> {
  const sql = await getSql();
  await ensureWikiPagesSeeded(sql);

  const cleanSlug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleanSlug) throw new Error("Provide a valid URL slug (letters, numbers, hyphens).");

  const pageSlug = `page-${cleanSlug}`;
  const pagePath = `/pages/${cleanSlug}`;
  const title = input.title.trim() || cleanSlug;
  const markdown = input.markdown.trim() || `# ${title}\n\nWrite your page content here.`;
  const now = nowIstIso();

  const existing = await sql<{ slug: string }>`
    select slug from cetls_wiki_pages where slug = ${pageSlug} or path = ${pagePath}
  `;
  if (existing.length > 0) {
    throw new Error(`A page at ${pagePath} already exists.`);
  }

  const initialStatus: WikiRevisionStatus =
    actor.role === "admin" ? "published" : "in_review";

  await sql`
    insert into cetls_wiki_pages (slug, path, title, is_custom, updated_at)
    values (${pageSlug}, ${pagePath}, ${title}, true, ${now})
  `;

  const inserted = await sql<{ id: number }>`
    insert into cetls_wiki_revisions (
      page_slug, rev_number, status, title, markdown, edit_summary,
      author_email, created_at, updated_at,
      submitted_by, submitted_at, reviewed_by, reviewed_at
    ) values (
      ${pageSlug},
      1,
      ${initialStatus},
      ${title},
      ${markdown},
      'Created new wiki page',
      ${actor.email},
      ${now},
      ${now},
      ${actor.email},
      ${now},
      ${actor.role === "admin" ? actor.email : null},
      ${actor.role === "admin" ? now : null}
    )
    returning id
  `;

  if (actor.role === "admin" && inserted[0]?.id) {
    await sql`
      update cetls_wiki_pages
      set published_rev_id = ${inserted[0].id}
      where slug = ${pageSlug}
    `;
  }

  return { slug: pageSlug, path: pagePath };
}
