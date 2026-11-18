import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Eye,
  FileEdit,
  History,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import {
  cmsCreateDraftFn,
  cmsDiscardDraftFn,
  cmsPublishRevisionFn,
  cmsRequestChangesFn,
  cmsRollbackRevisionFn,
  cmsSaveDraftFn,
  cmsSubmitForReviewFn,
  getCmsDashboardFn,
} from "@/lib/cms/cms-api";
import { computeSiteDataDiff } from "@/lib/cms/diff";
import type {
  CmsDashboardState,
  SiteRevisionRecord,
  SiteRevisionStatus,
} from "@/lib/cms/types";
import type { EventUserRole } from "@/lib/events/types";
import { setActiveSiteData } from "@/lib/site-data";
import type {
  NewsItem,
  Person,
  ProgrammeItem,
  RoadmapProgress,
  SiteData,
} from "@/lib/site-data.types";
import { cn } from "@/lib/utils";

interface SiteContentManagerProps {
  actorRole: EventUserRole;
  actorEmail: string;
}

type EditorSection =
  | "org"
  | "news"
  | "programmes"
  | "people"
  | "research"
  | "pages"
  | "diff"
  | "audit"
  | "json";

const STATUS_BADGE: Record<
  SiteRevisionStatus,
  { label: string; className: string }
> = {
  published: {
    label: "Live Published",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  in_review: {
    label: "In Review",
    className: "border-amber-300 bg-amber-50 text-amber-800",
  },
  draft: {
    label: "Draft",
    className: "border-sky-300 bg-sky-50 text-sky-800",
  },
  archived: {
    label: "Archived",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

function cloneSiteData(d: SiteData): SiteData {
  return JSON.parse(JSON.stringify(d)) as SiteData;
}

export function SiteContentManager({ actorRole }: SiteContentManagerProps) {
  const [cmsState, setCmsState] = useState<CmsDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null);
  const [section, setSection] = useState<EditorSection>("org");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftContent, setDraftContent] = useState<SiteData | null>(null);
  const [rawJsonText, setRawJsonText] = useState("");
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>("home");

  const loadCms = useCallback(async (preferRevisionId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const state = await getCmsDashboardFn();
      setCmsState(state);
      const target =
        (preferRevisionId
          ? state.revisions.find((r) => r.id === preferRevisionId)
          : undefined) ??
        state.revisions.find((r) => r.status === "in_review") ??
        state.revisions.find((r) => r.status === "draft") ??
        state.revisions.find((r) => r.status === "published") ??
        state.revisions[0];

      if (target) {
        setSelectedRevisionId(target.id);
        setDraftTitle(target.title);
        setDraftSummary(target.changeSummary);
        const cloned = cloneSiteData(target.content);
        setDraftContent(cloned);
        setRawJsonText(JSON.stringify(cloned, null, 2));
        setRawJsonError(null);
        setReviewNote(target.reviewNote ?? "");
        setDirty(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CMS revisions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCms();
  }, [loadCms]);

  const publishedRevision = useMemo(
    () => cmsState?.revisions.find((r) => r.status === "published") ?? null,
    [cmsState],
  );

  const selectedRevision: SiteRevisionRecord | null = useMemo(() => {
    if (!cmsState || selectedRevisionId === null) return null;
    return cmsState.revisions.find((r) => r.id === selectedRevisionId) ?? null;
  }, [cmsState, selectedRevisionId]);

  const isEditable = selectedRevision?.status === "draft";

  const selectRevision = (rev: SiteRevisionRecord) => {
    if (dirty && !window.confirm("You have unsaved changes. Switch revisions and discard them?")) {
      return;
    }
    setSelectedRevisionId(rev.id);
    setDraftTitle(rev.title);
    setDraftSummary(rev.changeSummary);
    const cloned = cloneSiteData(rev.content);
    setDraftContent(cloned);
    setRawJsonText(JSON.stringify(cloned, null, 2));
    setRawJsonError(null);
    setReviewNote(rev.reviewNote ?? "");
    setDirty(false);
    setError(null);
    setNotice(null);
  };

  const updateContent = (updater: (prev: SiteData) => SiteData) => {
    if (!draftContent || !isEditable) return;
    const next = updater(cloneSiteData(draftContent));
    setDraftContent(next);
    setRawJsonText(JSON.stringify(next, null, 2));
    setRawJsonError(null);
    setDirty(true);
  };

  const diffItems = useMemo(() => {
    if (!publishedRevision || !draftContent) return [];
    return computeSiteDataDiff(publishedRevision.content, draftContent);
  }, [publishedRevision, draftContent]);

  const handleCreateDraft = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await cmsCreateDraftFn({
        data: {
          title: `Content update (${new Date().toLocaleDateString("en-IN")})`,
          baseRevisionId: publishedRevision?.id,
        },
      });
      await loadCms(created.id);
      setNotice(`Created Draft v${created.versionNumber}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create draft.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (!selectedRevision || !draftContent) return false;
    if (rawJsonError) {
      setError("Fix the JSON syntax error before saving.");
      return false;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await cmsSaveDraftFn({
        data: {
          revisionId: selectedRevision.id,
          title: draftTitle,
          changeSummary: draftSummary,
          content: draftContent,
        },
      });
      await loadCms(saved.id);
      setNotice(`Saved Draft v${saved.versionNumber}.`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedRevision) return;
    if (dirty) {
      const ok = await handleSaveDraft();
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const submitted = await cmsSubmitForReviewFn({
        data: { revisionId: selectedRevision.id, changeSummary: draftSummary },
      });
      await loadCms(submitted.id);
      setNotice(`Submitted v${submitted.versionNumber} for review.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit for review.");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedRevision) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await cmsRequestChangesFn({
        data: { revisionId: selectedRevision.id, reviewNote },
      });
      await loadCms(updated.id);
      setNotice(`Returned v${updated.versionNumber} to draft with review note.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request changes.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedRevision) return;
    if (dirty && selectedRevision.status === "draft") {
      const ok = await handleSaveDraft();
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const published = await cmsPublishRevisionFn({
        data: { revisionId: selectedRevision.id, reviewNote },
      });
      setActiveSiteData(published.content);
      await loadCms(published.id);
      setNotice(`Published v${published.versionNumber} live!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish revision.");
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async (rev: SiteRevisionRecord) => {
    if (!window.confirm(`Roll back the live site to v${rev.versionNumber} (${rev.title})?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const published = await cmsRollbackRevisionFn({ data: { revisionId: rev.id } });
      setActiveSiteData(published.content);
      await loadCms(published.id);
      setNotice(`Rolled back live site to v${rev.versionNumber} (now v${published.versionNumber}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not roll back.");
    } finally {
      setBusy(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!selectedRevision || selectedRevision.status !== "draft") return;
    if (!window.confirm(`Discard Draft v${selectedRevision.versionNumber}?`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await cmsDiscardDraftFn({ data: { revisionId: selectedRevision.id } });
      await loadCms();
      setNotice(`Discarded Draft v${selectedRevision.versionNumber}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not discard draft.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading Site Content CMS…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top workflow header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Site Content CMS (Edit → Review → Publish)
          </h2>
          <p className="text-xs text-muted-foreground">
            Edit any page, news item, programme, person, or research section in a draft,
            submit it for admin review with a field-by-field diff, and publish live without redeploying.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateDraft}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Draft from Live</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Revisions sidebar */}
        <aside className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Revisions ({cmsState?.revisions.length ?? 0})
          </div>
          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {(cmsState?.revisions ?? []).map((rev) => {
              const badge = STATUS_BADGE[rev.status];
              const active = rev.id === selectedRevisionId;
              return (
                <div
                  key={rev.id}
                  onClick={() => selectRevision(rev)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") selectRevision(rev);
                  }}
                  className={cn(
                    "cursor-pointer rounded-md border p-2.5 text-left transition",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      v{rev.versionNumber}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-foreground">
                    {rev.title}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    by {rev.updatedBy}
                  </div>
                  {rev.status === "archived" && actorRole === "admin" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRollback(rev);
                      }}
                      disabled={busy}
                      className="mt-2 inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] text-foreground hover:bg-muted"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Rollback</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main workspace */}
        {selectedRevision && draftContent ? (
          <div className="space-y-4">
            {/* Revision metadata & workflow actions */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Revision v{selectedRevision.versionNumber}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      STATUS_BADGE[selectedRevision.status].className,
                    )}
                  >
                    {STATUS_BADGE[selectedRevision.status].label}
                  </span>
                  {dirty && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                      Unsaved changes
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isEditable && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSaveDraft()}
                        disabled={busy || !dirty}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Save Draft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSubmitForReview()}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit for Review</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDiscardDraft()}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Discard</span>
                      </button>
                    </>
                  )}

                  {actorRole === "admin" && selectedRevision.status === "in_review" && (
                    <button
                      type="button"
                      onClick={() => void handleRequestChanges()}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <FileEdit className="h-3.5 w-3.5" />
                      <span>Request Changes</span>
                    </button>
                  )}

                  {actorRole === "admin" &&
                    (selectedRevision.status === "in_review" ||
                      selectedRevision.status === "draft") && (
                      <button
                        type="button"
                        onClick={() => void handlePublish()}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve & Publish</span>
                      </button>
                    )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="font-medium text-foreground">Revision Title</span>
                  <input
                    type="text"
                    value={draftTitle}
                    disabled={!isEditable}
                    onChange={(e) => {
                      setDraftTitle(e.target.value);
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-foreground">Change Summary</span>
                  <input
                    type="text"
                    value={draftSummary}
                    disabled={!isEditable}
                    placeholder="What changed in this revision?"
                    onChange={(e) => {
                      setDraftSummary(e.target.value);
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
                  />
                </label>
              </div>

              {(selectedRevision.status === "in_review" || selectedRevision.reviewNote) && (
                <label className="block text-xs">
                  <span className="font-medium text-foreground">Reviewer Note</span>
                  <input
                    type="text"
                    value={reviewNote}
                    disabled={actorRole !== "admin" || selectedRevision.status !== "in_review"}
                    placeholder="Optional feedback or approval note…"
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
                  />
                </label>
              )}

              {!isEditable && (
                <div className="rounded bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  This revision is <strong>{STATUS_BADGE[selectedRevision.status].label}</strong> and
                  read-only. Click <strong>New Draft from Live</strong> to make new edits.
                </div>
              )}
            </div>

            {/* Section tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
              {(
                [
                  ["org", "Org & Hero"],
                  ["news", `News (${draftContent.news.items.length})`],
                  ["programmes", `Programmes (${draftContent.programmes.items.length})`],
                  ["people", `People (${draftContent.people.length})`],
                  ["research", "Research & Roadmap"],
                  ["pages", `Pages & SEO (${draftContent.pages.length})`],
                  ["diff", `Review Diff (${diffItems.length})`],
                  ["audit", "Audit Log"],
                  ["json", "Raw JSON"],
                ] as Array<[EditorSection, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                    section === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {id === "diff" && <Eye className="h-3.5 w-3.5" />}
                  {id === "audit" && <History className="h-3.5 w-3.5" />}
                  {id === "json" && <Code2 className="h-3.5 w-3.5" />}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Section editors */}
            <div className="rounded-lg border border-border bg-card p-4">
              {section === "org" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Organization, Hero & Contact</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldInput
                      label="Short Name"
                      value={draftContent.org.shortName}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({ ...d, org: { ...d.org, shortName: v } }))
                      }
                    />
                    <FieldInput
                      label="Full Organization Name"
                      value={draftContent.org.name.value}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({
                          ...d,
                          org: { ...d.org, name: { ...d.org.name, value: v } },
                        }))
                      }
                    />
                  </div>
                  <FieldTextarea
                    label="Site Meta Description"
                    value={draftContent.org.metaDescription}
                    disabled={!isEditable}
                    rows={2}
                    onChange={(v) =>
                      updateContent((d) => ({ ...d, org: { ...d.org, metaDescription: v } }))
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldInput
                      label="Hero Eyebrow"
                      value={draftContent.org.hero.eyebrow}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({
                          ...d,
                          org: { ...d.org, hero: { ...d.org.hero, eyebrow: v } },
                        }))
                      }
                    />
                    <FieldInput
                      label="Hero Headline"
                      value={draftContent.org.hero.headline}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({
                          ...d,
                          org: { ...d.org, hero: { ...d.org.hero, headline: v } },
                        }))
                      }
                    />
                  </div>
                  <FieldTextarea
                    label="Hero Summary"
                    value={draftContent.org.hero.summary}
                    disabled={!isEditable}
                    rows={3}
                    onChange={(v) =>
                      updateContent((d) => ({
                        ...d,
                        org: { ...d.org, hero: { ...d.org.hero, summary: v } },
                      }))
                    }
                  />
                  <FieldTextarea
                    label="Vision"
                    value={draftContent.org.vision.value}
                    disabled={!isEditable}
                    rows={2}
                    onChange={(v) =>
                      updateContent((d) => ({
                        ...d,
                        org: { ...d.org, vision: { ...d.org.vision, value: v } },
                      }))
                    }
                  />
                  <FieldTextarea
                    label="Mission"
                    value={draftContent.org.mission.value}
                    disabled={!isEditable}
                    rows={2}
                    onChange={(v) =>
                      updateContent((d) => ({
                        ...d,
                        org: { ...d.org, mission: { ...d.org.mission, value: v } },
                      }))
                    }
                  />
                  <FieldTextarea
                    label="Why IIIT Hyderabad"
                    value={draftContent.org.whyIiith.value}
                    disabled={!isEditable}
                    rows={3}
                    onChange={(v) =>
                      updateContent((d) => ({
                        ...d,
                        org: { ...d.org, whyIiith: { ...d.org.whyIiith, value: v } },
                      }))
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldInput
                      label="Contact Heading"
                      value={draftContent.contact.heading}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({
                          ...d,
                          contact: { ...d.contact, heading: v },
                        }))
                      }
                    />
                    <FieldInput
                      label="Contact Email"
                      value={draftContent.contact.email ?? ""}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({
                          ...d,
                          contact: { ...d.contact, email: v || null },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {section === "news" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">News & Announcements</h3>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          const item: NewsItem = {
                            id: `news-${Date.now()}`,
                            date: new Date().toISOString().slice(0, 10),
                            title: "New announcement",
                            venue: null,
                            body: "",
                            status: "confirmed",
                            published: false,
                          };
                          updateContent((d) => ({
                            ...d,
                            news: { ...d.news, items: [item, ...d.news.items] },
                          }));
                        }}
                        className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add News Item</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {draftContent.news.items.map((item, idx) => (
                      <div key={item.id} className="space-y-3 rounded-md border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {item.id}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={item.published}
                                disabled={!isEditable}
                                onChange={(e) =>
                                  updateContent((d) => {
                                    const items = [...d.news.items];
                                    items[idx] = { ...items[idx], published: e.target.checked };
                                    return { ...d, news: { ...d.news, items } };
                                  })
                                }
                              />
                              <span>Published</span>
                            </label>
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateContent((d) => ({
                                    ...d,
                                    news: {
                                      ...d.news,
                                      items: d.news.items.filter((_, i) => i !== idx),
                                    },
                                  }))
                                }
                                className="text-xs text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FieldInput
                            label="Title"
                            value={item.title}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const items = [...d.news.items];
                                items[idx] = { ...items[idx], title: v };
                                return { ...d, news: { ...d.news, items } };
                              })
                            }
                          />
                          <FieldInput
                            label="Date (YYYY-MM-DD)"
                            value={item.date}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const items = [...d.news.items];
                                items[idx] = { ...items[idx], date: v };
                                return { ...d, news: { ...d.news, items } };
                              })
                            }
                          />
                          <FieldInput
                            label="Venue (optional)"
                            value={item.venue ?? ""}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const items = [...d.news.items];
                                items[idx] = { ...items[idx], venue: v || null };
                                return { ...d, news: { ...d.news, items } };
                              })
                            }
                          />
                        </div>
                        <FieldTextarea
                          label="Body"
                          value={item.body}
                          disabled={!isEditable}
                          rows={2}
                          onChange={(v) =>
                            updateContent((d) => {
                              const items = [...d.news.items];
                              items[idx] = { ...items[idx], body: v };
                              return { ...d, news: { ...d.news, items } };
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "programmes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Programmes</h3>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          const item: ProgrammeItem = {
                            id: `prog-${Date.now()}`,
                            name: "New Programme",
                            description: "",
                            url: null,
                            domainId: null,
                            status: "confirmed",
                            published: false,
                          };
                          updateContent((d) => ({
                            ...d,
                            programmes: {
                              ...d.programmes,
                              items: [...d.programmes.items, item],
                            },
                          }));
                        }}
                        className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Programme</span>
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldInput
                      label="Section Heading"
                      value={draftContent.programmes.heading}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({
                          ...d,
                          programmes: { ...d.programmes, heading: v },
                        }))
                      }
                    />
                    <FieldInput
                      label="Section Summary"
                      value={draftContent.programmes.summary}
                      disabled={!isEditable}
                      onChange={(v) =>
                        updateContent((d) => ({
                          ...d,
                          programmes: { ...d.programmes, summary: v },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    {draftContent.programmes.items.map((prog, idx) => (
                      <div key={prog.id} className="space-y-2 rounded-md border border-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {prog.id}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={prog.published}
                                disabled={!isEditable}
                                onChange={(e) =>
                                  updateContent((d) => {
                                    const items = [...d.programmes.items];
                                    items[idx] = { ...items[idx], published: e.target.checked };
                                    return { ...d, programmes: { ...d.programmes, items } };
                                  })
                                }
                              />
                              <span>Published</span>
                            </label>
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateContent((d) => ({
                                    ...d,
                                    programmes: {
                                      ...d.programmes,
                                      items: d.programmes.items.filter((_, i) => i !== idx),
                                    },
                                  }))
                                }
                                className="text-xs text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FieldInput
                            label="Name"
                            value={prog.name}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const items = [...d.programmes.items];
                                items[idx] = { ...items[idx], name: v };
                                return { ...d, programmes: { ...d.programmes, items } };
                              })
                            }
                          />
                          <FieldInput
                            label="URL (optional)"
                            value={prog.url ?? ""}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const items = [...d.programmes.items];
                                items[idx] = { ...items[idx], url: v || null };
                                return { ...d, programmes: { ...d.programmes, items } };
                              })
                            }
                          />
                        </div>
                        <FieldTextarea
                          label="Description"
                          value={prog.description ?? ""}
                          disabled={!isEditable}
                          rows={2}
                          onChange={(v) =>
                            updateContent((d) => {
                              const items = [...d.programmes.items];
                              items[idx] = { ...items[idx], description: v || null };
                              return { ...d, programmes: { ...d.programmes, items } };
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "people" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">People Directory</h3>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          const person: Person = {
                            id: `person-${Date.now()}`,
                            name: "New Person",
                            honorific: null,
                            photo: null,
                            headline: null,
                            subtitleLines: [],
                            shortAffiliation: null,
                            bioShort: null,
                            bio: null,
                            links: [],
                            email: null,
                            status: "confirmed",
                            published: false,
                          };
                          updateContent((d) => ({ ...d, people: [person, ...d.people] }));
                        }}
                        className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Person</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {draftContent.people.map((person, idx) => (
                      <div key={person.id} className="space-y-2 rounded-md border border-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {person.id}
                          </span>
                          <label className="inline-flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={person.published}
                              disabled={!isEditable}
                              onChange={(e) =>
                                updateContent((d) => {
                                  const people = [...d.people];
                                  people[idx] = { ...people[idx], published: e.target.checked };
                                  return { ...d, people };
                                })
                              }
                            />
                            <span>Published</span>
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FieldInput
                            label="Name"
                            value={person.name}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const people = [...d.people];
                                people[idx] = { ...people[idx], name: v };
                                return { ...d, people };
                              })
                            }
                          />
                          <FieldInput
                            label="Headline / Title"
                            value={person.headline ?? ""}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const people = [...d.people];
                                people[idx] = { ...people[idx], headline: v || null };
                                return { ...d, people };
                              })
                            }
                          />
                          <FieldInput
                            label="Short Affiliation"
                            value={person.shortAffiliation ?? ""}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const people = [...d.people];
                                people[idx] = { ...people[idx], shortAffiliation: v || null };
                                return { ...d, people };
                              })
                            }
                          />
                        </div>
                        <FieldTextarea
                          label="Short Bio"
                          value={person.bioShort ?? ""}
                          disabled={!isEditable}
                          rows={2}
                          onChange={(v) =>
                            updateContent((d) => {
                              const people = [...d.people];
                              people[idx] = { ...people[idx], bioShort: v || null };
                              return { ...d, people };
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "research" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Research Domains</h3>
                    {draftContent.domains.map((dom, idx) => (
                      <div key={dom.id} className="space-y-2 rounded-md border border-border p-3">
                        <FieldInput
                          label={`Domain Title (${dom.id})`}
                          value={dom.title}
                          disabled={!isEditable}
                          onChange={(v) =>
                            updateContent((d) => {
                              const domains = [...d.domains];
                              domains[idx] = { ...domains[idx], title: v };
                              return { ...d, domains };
                            })
                          }
                        />
                        <FieldTextarea
                          label="Summary"
                          value={dom.summary}
                          disabled={!isEditable}
                          rows={2}
                          onChange={(v) =>
                            updateContent((d) => {
                              const domains = [...d.domains];
                              domains[idx] = { ...domains[idx], summary: v };
                              return { ...d, domains };
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Roadmap Phases</h3>
                    {draftContent.roadmap.phases.map((phase, idx) => (
                      <div key={phase.id} className="space-y-2 rounded-md border border-border p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FieldInput
                            label="Phase Title"
                            value={phase.title}
                            disabled={!isEditable}
                            onChange={(v) =>
                              updateContent((d) => {
                                const phases = [...d.roadmap.phases];
                                phases[idx] = { ...phases[idx], title: v };
                                return { ...d, roadmap: { ...d.roadmap, phases } };
                              })
                            }
                          />
                          <label className="block text-xs">
                            <span className="font-medium text-foreground">Progress</span>
                            <select
                              value={phase.progress}
                              disabled={!isEditable}
                              onChange={(e) =>
                                updateContent((d) => {
                                  const phases = [...d.roadmap.phases];
                                  phases[idx] = {
                                    ...phases[idx],
                                    progress: e.target.value as RoadmapProgress,
                                  };
                                  return { ...d, roadmap: { ...d.roadmap, phases } };
                                })
                              }
                              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
                            >
                              <option value="done">Done</option>
                              <option value="in-progress">In Progress</option>
                              <option value="planned">Planned</option>
                            </select>
                          </label>
                        </div>
                        <FieldTextarea
                          label="Body"
                          value={phase.body}
                          disabled={!isEditable}
                          rows={2}
                          onChange={(v) =>
                            updateContent((d) => {
                              const phases = [...d.roadmap.phases];
                              phases[idx] = { ...phases[idx], body: v };
                              return { ...d, roadmap: { ...d.roadmap, phases } };
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "pages" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Pages & SEO Metadata</h3>
                    <select
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                    >
                      {draftContent.pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} ({p.path})
                        </option>
                      ))}
                    </select>
                  </div>
                  {(() => {
                    const idx = draftContent.pages.findIndex((p) => p.id === selectedPageId);
                    const page = idx >= 0 ? draftContent.pages[idx] : draftContent.pages[0];
                    if (!page) return null;
                    const pageIndex = idx >= 0 ? idx : 0;
                    return (
                      <div className="space-y-3">
                        <FieldInput
                          label="Page Title"
                          value={page.title}
                          disabled={!isEditable}
                          onChange={(v) =>
                            updateContent((d) => {
                              const pages = [...d.pages];
                              pages[pageIndex] = { ...pages[pageIndex], title: v };
                              return { ...d, pages };
                            })
                          }
                        />
                        <FieldInput
                          label="OG Title (optional)"
                          value={page.seo.ogTitle ?? ""}
                          disabled={!isEditable}
                          onChange={(v) =>
                            updateContent((d) => {
                              const pages = [...d.pages];
                              pages[pageIndex] = {
                                ...pages[pageIndex],
                                seo: { ...pages[pageIndex].seo, ogTitle: v || null },
                              };
                              return { ...d, pages };
                            })
                          }
                        />
                        <FieldTextarea
                          label="SEO Description"
                          value={page.seo.description ?? ""}
                          disabled={!isEditable}
                          rows={2}
                          onChange={(v) =>
                            updateContent((d) => {
                              const pages = [...d.pages];
                              pages[pageIndex] = {
                                ...pages[pageIndex],
                                seo: { ...pages[pageIndex].seo, description: v || null },
                              };
                              return { ...d, pages };
                            })
                          }
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {section === "diff" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    Changes Compared to Live Published (v{publishedRevision?.versionNumber ?? 1})
                  </h3>
                  {diffItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No differences between this revision and the currently live published version.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {diffItems.map((item, idx) => (
                        <div
                          key={`${item.path}-${idx}`}
                          className="rounded-md border border-border p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <code className="font-mono text-[11px] font-semibold text-foreground">
                              {item.path}
                            </code>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                                item.kind === "added" && "bg-emerald-100 text-emerald-800",
                                item.kind === "removed" && "bg-red-100 text-red-800",
                                item.kind === "changed" && "bg-amber-100 text-amber-800",
                              )}
                            >
                              {item.kind}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div className="rounded bg-red-50/70 p-2 text-[11px] text-red-900">
                              <div className="font-semibold">Before (Live)</div>
                              <div className="mt-0.5 break-words">{item.before}</div>
                            </div>
                            <div className="rounded bg-emerald-50/70 p-2 text-[11px] text-emerald-900">
                              <div className="font-semibold">After (This Revision)</div>
                              <div className="mt-0.5 break-words">{item.after}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section === "audit" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Content Audit Log</h3>
                  <div className="space-y-2">
                    {(cmsState?.auditLogs ?? []).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold">{entry.action}</span>{" "}
                          <span className="text-muted-foreground">
                            (rev #{entry.revisionId}) by {entry.actorEmail}
                          </span>
                          {entry.note && (
                            <span className="ml-2 text-foreground">— {entry.note}</span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {entry.createdAt}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "json" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Raw SiteData JSON</h3>
                    {rawJsonError && (
                      <span className="text-xs font-medium text-red-600">{rawJsonError}</span>
                    )}
                  </div>
                  <textarea
                    value={rawJsonText}
                    disabled={!isEditable}
                    rows={22}
                    spellCheck={false}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRawJsonText(val);
                      try {
                        const parsed = JSON.parse(val) as SiteData;
                        setDraftContent(parsed);
                        setRawJsonError(null);
                        setDirty(true);
                      } catch (err) {
                        setRawJsonError(err instanceof Error ? err.message : "Invalid JSON");
                      }
                    }}
                    className="w-full rounded-md border border-border bg-background p-3 font-mono text-xs disabled:opacity-60"
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (val: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
      />
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  disabled,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  rows?: number;
  onChange: (val: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
      />
    </label>
  );
}
