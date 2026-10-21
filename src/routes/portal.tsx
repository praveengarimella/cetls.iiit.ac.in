import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  FolderKanban,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addPortalProjectUpdate,
  createPortalProject,
  deletePortalProjectUpdate,
  listPortalProjects,
  updatePortalProjectMeta,
  type PortalProjectRecord,
} from "@/lib/projects-api";
import { pageMetadata } from "@/lib/seo";
import {
  data,
  formatIsoDate,
  getDomains,
  getPage,
  getResearchQuestions,
  t,
} from "@/lib/site-data";
import type {
  ProjectHealth,
  ProjectStage,
  ProjectUpdateType,
  ProjectVisibility,
} from "@/lib/site-data.types";

export const Route = createFileRoute("/portal")({
  head: () => pageMetadata("portal"),
  component: PortalPage,
});

const STAGE_LABELS: Record<ProjectStage, string> = {
  proposed: "Proposed",
  active: "Active",
  pilot: "Pilot",
  completed: "Completed",
  paused: "Paused",
};

const HEALTH_STYLES: Record<
  ProjectHealth,
  { label: string; badgeClass: string; dotClass: string }
> = {
  "on-track": {
    label: "On Track",
    badgeClass: "border-primary/25 bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  "at-risk": {
    label: "At Risk",
    badgeClass: "border-accent/35 bg-accent/10 text-accent",
    dotClass: "bg-accent",
  },
  blocked: {
    label: "Blocked",
    badgeClass: "border-accent bg-accent/20 text-accent font-semibold",
    dotClass: "bg-accent",
  },
};

const UPDATE_TYPE_LABELS: Record<ProjectUpdateType, string> = {
  progress: "Progress Update",
  milestone: "Milestone",
  pilot: "Pilot Field Report",
  publication: "Paper / Output",
  blocker: "Blocker / Risk",
  decision: "Architecture / Design Decision",
};

function PortalPage() {
  const { user, isPending } = useCurrentUserState();
  const portalPage = getPage("portal");
  const domains = useMemo(() => getDomains(), []);
  const questions = useMemo(() => getResearchQuestions(), []);
  const publishedPeople = useMemo(
    () => data.people.filter((p) => p.published),
    [],
  );
  const personById = useMemo(
    () => new Map(data.people.map((p) => [p.id, p])),
    [],
  );

  const matchedPerson = useMemo(() => {
    const email = user?.primaryEmail?.toLowerCase().trim();
    if (!email) return publishedPeople[0];
    return (
      data.people.find((p) => p.email?.toLowerCase() === email) ??
      publishedPeople.find((p) => p.id.includes("praveen")) ??
      publishedPeople[0]
    );
  }, [user?.primaryEmail, publishedPeople]);

  const [projects, setProjects] = useState<PortalProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [questionFilter, setQuestionFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  // UI toggles
  const [showNewProject, setShowNewProject] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [activeUpdateFormProjectId, setActiveUpdateFormProjectId] = useState<number | null>(
    null,
  );
  const [copiedJson, setCopiedJson] = useState(false);

  // New project form state
  const [newCode, setNewCode] = useState("CETLS-P05");
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newStage, setNewStage] = useState<ProjectStage>("active");
  const [newHealth, setNewHealth] = useState<ProjectHealth>("on-track");
  const [newVisibility, setNewVisibility] = useState<ProjectVisibility>("internal");
  const [newDomainIds, setNewDomainIds] = useState<string[]>([domains[0]?.id ?? "k12"]);
  const [newQuestionIds, setNewQuestionIds] = useState<string[]>([
    questions[0]?.id ?? "rq-what",
  ]);
  const [newProgrammeId, setNewProgrammeId] = useState<string>("");
  const [newUsesMiddleware, setNewUsesMiddleware] = useState(true);
  const [newLeadPersonId, setNewLeadPersonId] = useState<string>(
    matchedPerson?.id ?? "vasudeva-varma",
  );
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [newStartDate, setNewStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  // New update form state
  const [updAuthorId, setUpdAuthorId] = useState<string>(
    matchedPerson?.id ?? "praveen-garimella",
  );
  const [updType, setUpdType] = useState<ProjectUpdateType>("progress");
  const [updHealth, setUpdHealth] = useState<ProjectHealth>("on-track");
  const [updDate, setUpdDate] = useState(new Date().toISOString().slice(0, 10));
  const [updTitle, setUpdTitle] = useState("");
  const [updBody, setUpdBody] = useState("");
  const [updNextSteps, setUpdNextSteps] = useState("");
  const [updBlockers, setUpdBlockers] = useState("");
  const [updExternalUrl, setUpdExternalUrl] = useState("");
  const [updIsPublic, setUpdIsPublic] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);

  const userId = user?.id ?? null;

  const refreshProjects = useCallback(async () => {
    setError(null);
    try {
      const rows = await listPortalProjects();
      setProjects(rows);
      if (rows.length > 0) {
        setExpandedProjectId((prev) => (prev === null ? rows[0].id : prev));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && userId) {
      void refreshProjects();
    }
  }, [isPending, userId, refreshProjects]);

  useEffect(() => {
    if (matchedPerson?.id) {
      setNewLeadPersonId(matchedPerson.id);
      setUpdAuthorId(matchedPerson.id);
    }
  }, [matchedPerson?.id]);

  if (isPending) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface p-8" />
        </main>
      </SiteShell>
    );
  }

  if (!user) {
    return <RedirectToSignIn />;
  }

  const filteredProjects = projects.filter((p) => {
    if (domainFilter !== "all" && !p.domainIds.includes(domainFilter)) return false;
    if (questionFilter !== "all" && !p.questionIds.includes(questionFilter)) return false;
    if (stageFilter !== "all" && p.stage !== stageFilter) return false;
    if (healthFilter !== "all" && p.health !== healthFilter) return false;
    return true;
  });

  const totalUpdates = projects.reduce((acc, p) => acc + p.updates.length, 0);
  const onTrackCount = projects.filter((p) => p.health === "on-track").length;
  const attentionCount = projects.filter((p) => p.health !== "on-track").length;

  function toggleStringInList(list: string[], id: string, setter: (next: string[]) => void) {
    if (list.includes(id)) {
      setter(list.filter((x) => x !== id));
    } else {
      setter([...list, id]);
    }
  }

  async function handleCreateProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newDomainIds.length === 0 || newQuestionIds.length === 0) {
      setError("Select at least one domain and one research question.");
      return;
    }
    setSavingProject(true);
    setError(null);
    try {
      await createPortalProject({
        data: {
          code: newCode,
          title: newTitle,
          summary: newSummary,
          stage: newStage,
          health: newHealth,
          visibility: newVisibility,
          domainIds: newDomainIds,
          questionIds: newQuestionIds,
          programmeId: newProgrammeId || null,
          usesMiddleware: newUsesMiddleware,
          leadPersonId: newLeadPersonId,
          memberPersonIds: newMemberIds,
          startDate: newStartDate || null,
          targetDate: newTargetDate || null,
          repoUrl: newRepoUrl || null,
          docUrl: newDocUrl || null,
        },
      });
      setNewTitle("");
      setNewSummary("");
      setNewCode(`CETLS-P0${projects.length + 2}`);
      setShowNewProject(false);
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleAddUpdate(e: FormEvent<HTMLFormElement>, projectId: number) {
    e.preventDefault();
    setSavingUpdate(true);
    setError(null);
    try {
      await addPortalProjectUpdate({
        data: {
          projectId,
          authorPersonId: updAuthorId,
          updateType: updType,
          health: updHealth,
          title: updTitle,
          body: updBody,
          nextSteps: updNextSteps || null,
          blockers: updBlockers || null,
          externalUrl: updExternalUrl || null,
          isPublic: updIsPublic,
          updateDate: updDate,
        },
      });
      setUpdTitle("");
      setUpdBody("");
      setUpdNextSteps("");
      setUpdBlockers("");
      setUpdExternalUrl("");
      setActiveUpdateFormProjectId(null);
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post update.");
    } finally {
      setSavingUpdate(false);
    }
  }

  async function handleExportJson() {
    const exported = {
      heading: data.projects.heading,
      intro: data.projects.intro,
      items: projects.map((p) => ({
        id: p.slug,
        code: p.code,
        title: p.title,
        summary: p.summary,
        status: "confirmed",
        published: p.visibility === "public",
        visibility: p.visibility,
        stage: p.stage,
        health: p.health,
        domainIds: p.domainIds,
        questionIds: p.questionIds,
        programmeId: p.programmeId,
        usesMiddleware: p.usesMiddleware,
        leadPersonId: p.leadPersonId,
        memberPersonIds: p.memberPersonIds,
        startDate: p.startDate,
        targetDate: p.targetDate,
        repoUrl: p.repoUrl,
        docUrl: p.docUrl,
        updates: p.updates.map((u) => ({
          id: `upd-${u.updateDate}-${u.id}`,
          date: u.updateDate,
          authorPersonId: u.authorPersonId,
          type: u.updateType,
          health: u.health,
          title: u.title,
          body: u.body,
          nextSteps: u.nextSteps,
          blockers: u.blockers,
          externalUrl: u.externalUrl,
          published: u.isPublic,
        })),
      })),
    };
    await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  }

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-accent uppercase">
              {data.org.shortName} Internal Workspace
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t(portalPage.title)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {t(data.projects.intro)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <UserButton />
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-fg transition-colors hover:border-primary"
            >
              <Download className="size-3.5" />
              {copiedJson ? "Copied site-data JSON!" : "Copy JSON Snapshot"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewProject((v) => !v)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-fg transition-colors hover:bg-primary-hover"
            >
              <Plus className="size-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>Tracked Projects</span>
              <FolderKanban className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold">{projects.length}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>On Track</span>
              <CheckCircle2 className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold">{onTrackCount}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>At Risk / Blocked</span>
              <AlertTriangle className="size-4 text-accent" />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold">{attentionCount}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>Logged Updates</span>
              <Clock className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold">{totalUpdates}</p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-accent">
            {error}
          </div>
        )}

        {/* New Project Composer */}
        {showNewProject && (
          <form
            onSubmit={handleCreateProject}
            className="mt-8 rounded-2xl border border-primary/30 bg-surface p-6 sm:p-8"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-display text-xl font-semibold">
                Register Research Project
              </h2>
              <button
                type="button"
                onClick={() => setShowNewProject(false)}
                className="text-xs font-medium text-muted hover:text-fg"
              >
                Cancel
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium">Project Code</span>
                <input
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-medium">Project Title</span>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Concise project title"
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium">Research Summary & Objectives</span>
              <textarea
                required
                rows={3}
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium">Lead Faculty / PI</span>
                <select
                  value={newLeadPersonId}
                  onChange={(e) => setNewLeadPersonId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {publishedPeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium">Lifecycle Stage</span>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as ProjectStage)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {(Object.keys(STAGE_LABELS) as ProjectStage[]).map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium">Current Health</span>
                <select
                  value={newHealth}
                  onChange={(e) => setNewHealth(e.target.value as ProjectHealth)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="on-track">On Track</option>
                  <option value="at-risk">At Risk</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium">Linked Programme</span>
                <select
                  value={newProgrammeId}
                  onChange={(e) => setNewProgrammeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">None / Standalone</option>
                  {data.programmes.items.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {t(prog.name)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium">Lifespan Domains</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {domains.map((d) => {
                    const active = newDomainIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() =>
                          toggleStringInList(newDomainIds, d.id, setNewDomainIds)
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-fg"
                            : "border-border bg-bg text-muted hover:text-fg"
                        }`}
                      >
                        {t(d.title)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium">Fundamental Research Questions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {questions.map((q) => {
                    const active = newQuestionIds.includes(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() =>
                          toggleStringInList(newQuestionIds, q.id, setNewQuestionIds)
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-fg"
                            : "border-border bg-bg text-muted hover:text-fg"
                        }`}
                      >
                        Q{q.order}: {t(q.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium">Collaborating Faculty & Team</p>
              <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border bg-bg p-2.5">
                {publishedPeople.map((person) => {
                  const selected =
                    person.id === newLeadPersonId || newMemberIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() =>
                        toggleStringInList(newMemberIds, person.id, setNewMemberIds)
                      }
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                        selected
                          ? "bg-primary/15 font-medium text-primary"
                          : "bg-surface text-muted hover:text-fg"
                      }`}
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium">Start Date</span>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Target Milestone Date</span>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Repository URL (optional)</span>
                <input
                  type="url"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium">Spec / Doc URL (optional)</span>
                <input
                  type="url"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={newUsesMiddleware}
                    onChange={(e) => setNewUsesMiddleware(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Uses {t(data.platform.name)}
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <span>Visibility:</span>
                  <select
                    value={newVisibility}
                    onChange={(e) =>
                      setNewVisibility(e.target.value as ProjectVisibility)
                    }
                    className="rounded-md border border-border bg-bg px-2 py-1 text-xs"
                  >
                    <option value="internal">Internal Only</option>
                    <option value="public">Public Ready</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProject}
                className="inline-flex min-h-10 items-center rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-60"
              >
                {savingProject ? "Saving Project…" : "Create Project"}
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="mt-8 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
          <label className="block">
            <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Domain
            </span>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg"
            >
              <option value="all">All Domains ({domains.length})</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {t(d.title)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Research Question
            </span>
            <select
              value={questionFilter}
              onChange={(e) => setQuestionFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg"
            >
              <option value="all">All Questions ({questions.length})</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  Q{q.order}: {t(q.label)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Stage
            </span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg"
            >
              <option value="all">All Stages</option>
              {(Object.keys(STAGE_LABELS) as ProjectStage[]).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Health Status
            </span>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-fg"
            >
              <option value="all">All Health States</option>
              <option value="on-track">On Track</option>
              <option value="at-risk">At Risk</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 animate-pulse rounded-2xl border border-border bg-surface p-6"
              />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-12 text-center">
            <p className="font-display text-lg font-semibold">
              No projects match the current filters
            </p>
            <p className="mt-1 text-sm text-muted">
              Reset filters above or register a new research project.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {filteredProjects.map((project) => {
              const healthStyle = HEALTH_STYLES[project.health] ?? HEALTH_STYLES["on-track"];
              const leadPerson = personById.get(project.leadPersonId);
              const isExpanded = expandedProjectId === project.id;
              const isPostingUpdate = activeUpdateFormProjectId === project.id;

              return (
                <article
                  key={project.id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-xs"
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
                            {project.code}
                          </span>
                          <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs font-medium text-muted">
                            {STAGE_LABELS[project.stage]}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${healthStyle.badgeClass}`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${healthStyle.dotClass}`}
                            />
                            {healthStyle.label}
                          </span>
                          {project.usesMiddleware && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              <Layers className="size-3" />
                              {t(data.platform.name)}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-3 font-display text-2xl font-semibold">
                          {project.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedProjectId(project.id);
                            setActiveUpdateFormProjectId(
                              isPostingUpdate ? null : project.id,
                            );
                          }}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-fg hover:bg-primary-hover"
                        >
                          <Plus className="size-3.5" />
                          Post Update
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedProjectId(isExpanded ? null : project.id)
                          }
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg hover:border-primary"
                        >
                          Updates ({project.updates.length})
                          {isExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 max-w-4xl leading-relaxed text-muted">
                      {project.summary}
                    </p>

                    {/* Domain & Question Tags */}
                    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                      {project.domainIds.map((did) => {
                        const dom = domains.find((d) => d.id === did);
                        return dom ? (
                          <span
                            key={did}
                            className="rounded-md border border-border bg-bg px-2.5 py-1 font-medium text-fg"
                          >
                            {t(dom.title)}
                          </span>
                        ) : null;
                      })}
                      {project.questionIds.map((qid) => {
                        const q = questions.find((item) => item.id === qid);
                        return q ? (
                          <span
                            key={qid}
                            className="rounded-md bg-soft px-2.5 py-1 text-muted"
                          >
                            Q{q.order}: {t(q.label)}
                          </span>
                        ) : null;
                      })}
                    </div>

                    {/* Faculty Team & Links Bar */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted">
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <span className="font-medium text-fg">Lead: </span>
                          <span>{leadPerson?.name ?? project.leadPersonId}</span>
                        </div>
                        {project.memberPersonIds.length > 0 && (
                          <div>
                            <span className="font-medium text-fg">Team: </span>
                            <span>
                              {project.memberPersonIds
                                .map((id) => personById.get(id)?.name ?? id)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        {project.startDate && (
                          <span>Started {formatIsoDate(project.startDate)}</span>
                        )}
                        {project.repoUrl && (
                          <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            Repo <ExternalLink className="size-3" />
                          </a>
                        )}
                        {project.docUrl && (
                          <a
                            href={project.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            Docs <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Update Form */}
                  {isPostingUpdate && (
                    <form
                      onSubmit={(e) => handleAddUpdate(e, project.id)}
                      className="border-t border-border bg-soft/60 p-6 sm:px-8"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-semibold">
                          Log Project Update · {project.code}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveUpdateFormProjectId(null)}
                          className="text-xs text-muted hover:text-fg"
                        >
                          Close
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-4">
                        <label className="block">
                          <span className="text-xs font-medium">Author</span>
                          <select
                            value={updAuthorId}
                            onChange={(e) => setUpdAuthorId(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                          >
                            {publishedPeople.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium">Update Type</span>
                          <select
                            value={updType}
                            onChange={(e) =>
                              setUpdType(e.target.value as ProjectUpdateType)
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                          >
                            {(Object.keys(UPDATE_TYPE_LABELS) as ProjectUpdateType[]).map(
                              (ut) => (
                                <option key={ut} value={ut}>
                                  {UPDATE_TYPE_LABELS[ut]}
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium">Project Health</span>
                          <select
                            value={updHealth}
                            onChange={(e) =>
                              setUpdHealth(e.target.value as ProjectHealth)
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                          >
                            <option value="on-track">On Track</option>
                            <option value="at-risk">At Risk</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium">Date</span>
                          <input
                            type="date"
                            required
                            value={updDate}
                            onChange={(e) => setUpdDate(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                          />
                        </label>
                      </div>

                      <label className="mt-4 block">
                        <span className="text-xs font-medium">Update Headline</span>
                        <input
                          required
                          value={updTitle}
                          onChange={(e) => setUpdTitle(e.target.value)}
                          placeholder="Key milestone, finding, or status headline"
                          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="mt-3 block">
                        <span className="text-xs font-medium">Detailed Progress / Notes</span>
                        <textarea
                          required
                          rows={3}
                          value={updBody}
                          onChange={(e) => setUpdBody(e.target.value)}
                          placeholder="What was accomplished, observed, or decided?"
                          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </label>

                      <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        <label className="block">
                          <span className="text-xs font-medium">Next Steps (optional)</span>
                          <input
                            value={updNextSteps}
                            onChange={(e) => setUpdNextSteps(e.target.value)}
                            placeholder="Immediate next actions"
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium">Blockers / Needs (optional)</span>
                          <input
                            value={updBlockers}
                            onChange={(e) => setUpdBlockers(e.target.value)}
                            placeholder="Any open blockers or dependencies"
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium">Artifact / Link URL (optional)</span>
                          <input
                            type="url"
                            value={updExternalUrl}
                            onChange={(e) => setUpdExternalUrl(e.target.value)}
                            placeholder="https://..."
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <label className="inline-flex items-center gap-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={updIsPublic}
                            onChange={(e) => setUpdIsPublic(e.target.checked)}
                            className="size-4 accent-primary"
                          />
                          Eligible for public website / news promotion
                        </label>
                        <button
                          type="submit"
                          disabled={savingUpdate}
                          className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-60"
                        >
                          {savingUpdate ? "Posting…" : "Save Update"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Updates Timeline */}
                  {isExpanded && (
                    <div className="border-t border-border bg-bg/60 p-6 sm:px-8">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                          Chronological Update Log ({project.updates.length})
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted">Quick Stage:</span>
                          <select
                            value={project.stage}
                            onChange={async (e) => {
                              await updatePortalProjectMeta({
                                data: {
                                  projectId: project.id,
                                  stage: e.target.value as ProjectStage,
                                  health: project.health,
                                  visibility: project.visibility,
                                  repoUrl: project.repoUrl,
                                  docUrl: project.docUrl,
                                },
                              });
                              await refreshProjects();
                            }}
                            className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
                          >
                            {(Object.keys(STAGE_LABELS) as ProjectStage[]).map((s) => (
                              <option key={s} value={s}>
                                {STAGE_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {project.updates.length === 0 ? (
                        <p className="text-sm text-muted">
                          No updates logged yet. Use “Post Update” above to record a
                          milestone or progress note.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {project.updates.map((upd) => {
                            const author = personById.get(upd.authorPersonId);
                            const uHealth =
                              HEALTH_STYLES[upd.health] ?? HEALTH_STYLES["on-track"];
                            return (
                              <div
                                key={upd.id}
                                className="rounded-xl border border-border bg-surface p-5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-accent">
                                      {formatIsoDate(upd.updateDate)}
                                    </span>
                                    <span className="rounded-md bg-soft px-2 py-0.5 font-medium text-fg">
                                      {UPDATE_TYPE_LABELS[upd.updateType]}
                                    </span>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 ${uHealth.badgeClass}`}
                                    >
                                      {uHealth.label}
                                    </span>
                                    {upd.isPublic && (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                                        Public-ready
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-muted">
                                    <span>By {author?.name ?? upd.authorPersonId}</span>
                                    <button
                                      type="button"
                                      aria-label="Delete update"
                                      onClick={async () => {
                                        await deletePortalProjectUpdate({
                                          data: { updateId: upd.id },
                                        });
                                        await refreshProjects();
                                      }}
                                      className="text-muted hover:text-accent"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <h4 className="mt-2 font-display text-base font-semibold">
                                  {upd.title}
                                </h4>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                                  {upd.body}
                                </p>

                                {(upd.nextSteps || upd.blockers || upd.externalUrl) && (
                                  <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                                    {upd.nextSteps && (
                                      <p className="text-muted">
                                        <span className="font-medium text-fg">
                                          Next steps:{" "}
                                        </span>
                                        {upd.nextSteps}
                                      </p>
                                    )}
                                    {upd.blockers && (
                                      <p className="text-accent">
                                        <span className="font-medium">Blockers: </span>
                                        {upd.blockers}
                                      </p>
                                    )}
                                    {upd.externalUrl && (
                                      <p>
                                        <a
                                          href={upd.externalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                        >
                                          View artifact <ExternalLink className="size-3" />
                                        </a>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </SiteShell>
  );
}
