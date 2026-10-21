import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { data, t } from "@/lib/site-data";
import type {
  ProjectHealth,
  ProjectStage,
  ProjectUpdateType,
  ProjectVisibility,
} from "@/lib/site-data.types";

export interface PortalProjectUpdateRecord {
  id: number;
  projectId: number;
  authorPersonId: string;
  updateType: ProjectUpdateType;
  health: ProjectHealth;
  title: string;
  body: string;
  nextSteps: string | null;
  blockers: string | null;
  externalUrl: string | null;
  isPublic: boolean;
  updateDate: string;
  createdAt: string;
}

export interface PortalProjectRecord {
  id: number;
  slug: string;
  code: string;
  title: string;
  summary: string;
  stage: ProjectStage;
  health: ProjectHealth;
  visibility: ProjectVisibility;
  domainIds: string[];
  questionIds: string[];
  programmeId: string | null;
  usesMiddleware: boolean;
  leadPersonId: string;
  memberPersonIds: string[];
  startDate: string | null;
  targetDate: string | null;
  repoUrl: string | null;
  docUrl: string | null;
  updatedAt: string;
  updates: PortalProjectUpdateRecord[];
}

interface RawProjectRow {
  id: number;
  slug: string;
  code: string;
  title: string;
  summary: string;
  stage: string;
  health: string;
  visibility: string;
  domain_ids: string;
  question_ids: string;
  programme_id: string | null;
  uses_middleware: boolean;
  lead_person_id: string;
  member_person_ids: string;
  start_date: string | null;
  target_date: string | null;
  repo_url: string | null;
  doc_url: string | null;
  updated_at: string | Date;
}

interface RawUpdateRow {
  id: number;
  project_id: number;
  author_person_id: string;
  update_type: string;
  health: string;
  title: string;
  body: string;
  next_steps: string | null;
  blockers: string | null;
  external_url: string | null;
  is_public: boolean;
  update_date: string;
  created_at: string | Date;
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function ensureSeedProjectsForUser(sql: Sql, userId: string): Promise<void> {
  const existing = await sql<{ cnt: number }>`
    select count(*) as cnt from portal_projects where user_id = ${userId}
  `;
  if ((existing[0]?.cnt ?? 0) > 0) return;

  for (const seed of data.projects.items) {
    const inserted = await sql<{ id: number }>`
      insert into portal_projects (
        user_id, slug, code, title, summary, stage, health, visibility,
        domain_ids, question_ids, programme_id, uses_middleware,
        lead_person_id, member_person_ids, start_date, target_date, repo_url, doc_url
      ) values (
        ${userId},
        ${seed.id},
        ${seed.code},
        ${t(seed.title)},
        ${t(seed.summary)},
        ${seed.stage},
        ${seed.health},
        ${seed.visibility},
        ${JSON.stringify(seed.domainIds)},
        ${JSON.stringify(seed.questionIds)},
        ${seed.programmeId},
        ${seed.usesMiddleware},
        ${seed.leadPersonId},
        ${JSON.stringify(seed.memberPersonIds)},
        ${seed.startDate},
        ${seed.targetDate},
        ${seed.repoUrl},
        ${seed.docUrl}
      )
      on conflict (user_id, slug) do nothing
      returning id
    `;
    const projectId = inserted[0]?.id;
    if (!projectId) continue;

    for (const upd of seed.updates) {
      await sql`
        insert into portal_project_updates (
          user_id, project_id, author_person_id, update_type, health,
          title, body, next_steps, blockers, external_url, is_public, update_date
        ) values (
          ${userId},
          ${projectId},
          ${upd.authorPersonId},
          ${upd.type},
          ${upd.health},
          ${t(upd.title)},
          ${t(upd.body)},
          ${upd.nextSteps ? t(upd.nextSteps) : null},
          ${upd.blockers ? t(upd.blockers) : null},
          ${upd.externalUrl},
          ${upd.published},
          ${upd.date}
        )
      `;
    }
  }
}

export const listPortalProjects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PortalProjectRecord[]> => {
    const sql = await getSql();
    await ensureSeedProjectsForUser(sql, context.userId);

    const projectRows = await sql<RawProjectRow>`
      select
        id, slug, code, title, summary, stage, health, visibility,
        domain_ids, question_ids, programme_id, uses_middleware,
        lead_person_id, member_person_ids, start_date, target_date,
        repo_url, doc_url, updated_at
      from portal_projects
      where user_id = ${context.userId}
      order by code asc, id asc
    `;

    const updateRows = await sql<RawUpdateRow>`
      select
        id, project_id, author_person_id, update_type, health,
        title, body, next_steps, blockers, external_url,
        is_public, update_date, created_at
      from portal_project_updates
      where user_id = ${context.userId}
      order by update_date desc, id desc
    `;

    const updatesByProject = new Map<number, PortalProjectUpdateRecord[]>();
    for (const u of updateRows) {
      const list = updatesByProject.get(u.project_id) ?? [];
      list.push({
        id: u.id,
        projectId: u.project_id,
        authorPersonId: u.author_person_id,
        updateType: u.update_type as ProjectUpdateType,
        health: u.health as ProjectHealth,
        title: u.title,
        body: u.body,
        nextSteps: u.next_steps,
        blockers: u.blockers,
        externalUrl: u.external_url,
        isPublic: Boolean(u.is_public),
        updateDate: u.update_date,
        createdAt: String(u.created_at),
      });
      updatesByProject.set(u.project_id, list);
    }

    return projectRows.map((p) => ({
      id: p.id,
      slug: p.slug,
      code: p.code,
      title: p.title,
      summary: p.summary,
      stage: p.stage as ProjectStage,
      health: p.health as ProjectHealth,
      visibility: p.visibility as ProjectVisibility,
      domainIds: parseJsonArray(p.domain_ids),
      questionIds: parseJsonArray(p.question_ids),
      programmeId: p.programme_id,
      usesMiddleware: Boolean(p.uses_middleware),
      leadPersonId: p.lead_person_id,
      memberPersonIds: parseJsonArray(p.member_person_ids),
      startDate: p.start_date,
      targetDate: p.target_date,
      repoUrl: p.repo_url,
      docUrl: p.doc_url,
      updatedAt: String(p.updated_at),
      updates: updatesByProject.get(p.id) ?? [],
    }));
  });

export interface CreatePortalProjectInput {
  code: string;
  title: string;
  summary: string;
  stage: ProjectStage;
  health: ProjectHealth;
  visibility: ProjectVisibility;
  domainIds: string[];
  questionIds: string[];
  programmeId: string | null;
  usesMiddleware: boolean;
  leadPersonId: string;
  memberPersonIds: string[];
  startDate: string | null;
  targetDate: string | null;
  repoUrl: string | null;
  docUrl: string | null;
}

export const createPortalProject = createServerFn({ method: "POST" })
  .validator((input: CreatePortalProjectInput) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data: input }) => {
    const title = input.title.trim();
    const summary = input.summary.trim();
    if (!title || !summary) {
      throw new Error("Project title and summary are required.");
    }
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) +
      "-" +
      Date.now().toString(36).slice(-4);

    const sql = await getSql();
    await sql`
      insert into portal_projects (
        user_id, slug, code, title, summary, stage, health, visibility,
        domain_ids, question_ids, programme_id, uses_middleware,
        lead_person_id, member_person_ids, start_date, target_date, repo_url, doc_url
      ) values (
        ${context.userId},
        ${slug},
        ${input.code.trim() || "CETLS-NEW"},
        ${title},
        ${summary},
        ${input.stage},
        ${input.health},
        ${input.visibility},
        ${JSON.stringify(input.domainIds)},
        ${JSON.stringify(input.questionIds)},
        ${input.programmeId || null},
        ${Boolean(input.usesMiddleware)},
        ${input.leadPersonId},
        ${JSON.stringify(
          input.memberPersonIds.includes(input.leadPersonId)
            ? input.memberPersonIds
            : [input.leadPersonId, ...input.memberPersonIds],
        )},
        ${input.startDate || null},
        ${input.targetDate || null},
        ${input.repoUrl?.trim() || null},
        ${input.docUrl?.trim() || null}
      )
    `;
    return { ok: true };
  });

export interface AddProjectUpdateInput {
  projectId: number;
  authorPersonId: string;
  updateType: ProjectUpdateType;
  health: ProjectHealth;
  title: string;
  body: string;
  nextSteps: string | null;
  blockers: string | null;
  externalUrl: string | null;
  isPublic: boolean;
  updateDate: string;
}

export const addPortalProjectUpdate = createServerFn({ method: "POST" })
  .validator((input: AddProjectUpdateInput) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data: input }) => {
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title || !body) {
      throw new Error("Update title and summary are required.");
    }
    const sql = await getSql();
    const owned = await sql<{ id: number }>`
      select id from portal_projects
      where id = ${input.projectId} and user_id = ${context.userId}
    `;
    if (owned.length === 0) {
      throw new Error("Project not found.");
    }

    await sql`
      insert into portal_project_updates (
        user_id, project_id, author_person_id, update_type, health,
        title, body, next_steps, blockers, external_url, is_public, update_date
      ) values (
        ${context.userId},
        ${input.projectId},
        ${input.authorPersonId},
        ${input.updateType},
        ${input.health},
        ${title},
        ${body},
        ${input.nextSteps?.trim() || null},
        ${input.blockers?.trim() || null},
        ${input.externalUrl?.trim() || null},
        ${Boolean(input.isPublic)},
        ${input.updateDate || new Date().toISOString().slice(0, 10)}
      )
    `;

    await sql`
      update portal_projects
      set health = ${input.health}, updated_at = now()
      where id = ${input.projectId} and user_id = ${context.userId}
    `;
    return { ok: true };
  });

export interface UpdateProjectMetaInput {
  projectId: number;
  stage: ProjectStage;
  health: ProjectHealth;
  visibility: ProjectVisibility;
  repoUrl: string | null;
  docUrl: string | null;
}

export const updatePortalProjectMeta = createServerFn({ method: "POST" })
  .validator((input: UpdateProjectMetaInput) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data: input }) => {
    const sql = await getSql();
    await sql`
      update portal_projects
      set
        stage = ${input.stage},
        health = ${input.health},
        visibility = ${input.visibility},
        repo_url = ${input.repoUrl?.trim() || null},
        doc_url = ${input.docUrl?.trim() || null},
        updated_at = now()
      where id = ${input.projectId} and user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const deletePortalProjectUpdate = createServerFn({ method: "POST" })
  .validator((input: { updateId: number }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data: input }) => {
    const sql = await getSql();
    await sql`
      delete from portal_project_updates
      where id = ${input.updateId} and user_id = ${context.userId}
    `;
    return { ok: true };
  });
