import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bold,
  BookOpen,
  CheckCircle2,
  Columns2,
  Eye,
  FileDiff,
  Heading2,
  Heading3,
  History,
  Italic,
  LayoutGrid,
  Link2,
  List,
  PencilLine,
  RotateCcw,
  Save,
  Send,
  SquareSplitHorizontal,
  Trash2,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { WikiMarkdownRenderer } from "@/components/wiki/markdown-renderer";
import type { CetlsEvent } from "@/lib/events/types";
import { cn } from "@/lib/utils";
import { computeMarkdownDiff, summarizeDiffCounts } from "@/lib/wiki/line-diff";
import { getSeedWikiPageBySlug } from "@/lib/wiki/seed-markdown";
import type { WikiPagePayload, WikiRevisionRecord } from "@/lib/wiki/types";
import {
  discardWikiDraftFn,
  getWikiPageFn,
  publishWikiRevisionFn,
  requestWikiChangesFn,
  revertWikiPageFn,
  saveWikiDraftFn,
  submitWikiReviewFn,
} from "@/lib/wiki/wiki-api";

type WikiTab = "read" | "edit" | "review" | "history";
type EditorLayout = "split" | "write" | "preview";
type ReviewViewMode = "diff" | "rendered";

function readInitialModeFromUrl(): WikiTab {
  if (typeof window === "undefined") return "read";
  const m = new URLSearchParams(window.location.search).get("mode");
  if (m === "edit" || m === "review" || m === "history") return m;
  return "read";
}

export function WikiPageView({
  pageSlug,
  initialPayload,
  events,
}: {
  pageSlug: string;
  initialPayload?: WikiPagePayload | null;
  events?: CetlsEvent[];
}) {
  const seedFallback = useMemo((): WikiPagePayload | null => {
    if (initialPayload) return initialPayload;
    const seed = getSeedWikiPageBySlug(pageSlug);
    if (!seed) return null;
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
        createdAt: "",
        updatedAt: "",
        submittedBy: null,
        submittedAt: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
      },
      actor: null,
      workingDraft: null,
      revisions: [],
    };
  }, [initialPayload, pageSlug]);

  const [payload, setPayload] = useState<WikiPagePayload | null>(seedFallback);
  const [loadingPage, setLoadingPage] = useState(!seedFallback);
  const [tab, setTab] = useState<WikiTab>("read");
  const [editorLayout, setEditorLayout] = useState<EditorLayout>("split");
  const [reviewMode, setReviewMode] = useState<ReviewViewMode>("diff");

  const [editTitle, setEditTitle] = useState("");
  const [editMarkdown, setEditMarkdown] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [dirty, setDirty] = useState(false);

  const [compareRev, setCompareRev] = useState<WikiRevisionRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const syncEditorFromPayload = useCallback((next: WikiPagePayload) => {
    const source = next.workingDraft ?? next.published;
    setEditTitle(source.title);
    setEditMarkdown(source.markdown);
    setEditSummary(next.workingDraft?.editSummary ?? "");
    setReviewNote(next.workingDraft?.reviewNote ?? "");
    setDirty(false);
  }, []);

  const refreshPage = useCallback(
    async (resetEditor = false) => {
      try {
        const fresh = await getWikiPageFn({ data: pageSlug });
        if (fresh) {
          setPayload(fresh);
          if (resetEditor) {
            syncEditorFromPayload(fresh);
          }
        }
      } catch {
        // Keep fallback payload
      } finally {
        setLoadingPage(false);
      }
    },
    [pageSlug, syncEditorFromPayload],
  );

  useEffect(() => {
    setPayload(seedFallback);
    setLoadingPage(!seedFallback);
    setCompareRev(null);
    setError(null);
    setNotice(null);
    const requestedMode = readInitialModeFromUrl();
    void getWikiPageFn({ data: pageSlug })
      .then((fresh) => {
        if (fresh) {
          setPayload(fresh);
          syncEditorFromPayload(fresh);
          if (fresh.actor && requestedMode !== "read") {
            setTab(requestedMode);
          } else {
            setTab("read");
          }
        }
      })
      .finally(() => setLoadingPage(false));
  }, [pageSlug, seedFallback, syncEditorFromPayload]);

  const actor = payload?.actor ?? null;
  const isAdmin = actor?.role === "admin";
  const workingDraft = payload?.workingDraft ?? null;
  const published = payload?.published ?? null;

  const activeReviewTarget = compareRev ?? workingDraft ?? published;

  const diffLines = useMemo(() => {
    if (!published || !activeReviewTarget) return [];
    return computeMarkdownDiff(published.markdown, activeReviewTarget.markdown);
  }, [published, activeReviewTarget]);

  const diffSummary = useMemo(() => summarizeDiffCounts(diffLines), [diffLines]);

  function insertAtCursor(prefix: string, suffix = "", placeholder = "text") {
    const el = textareaRef.current;
    if (!el) {
      setEditMarkdown((prev) => `${prev}\n${prefix}${placeholder}${suffix}`);
      setDirty(true);
      return;
    }
    const start = el.selectionStart ?? editMarkdown.length;
    const end = el.selectionEnd ?? editMarkdown.length;
    const selected = editMarkdown.slice(start, end) || placeholder;
    const next =
      editMarkdown.slice(0, start) +
      prefix +
      selected +
      suffix +
      editMarkdown.slice(end);
    setEditMarkdown(next);
    setDirty(true);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length + selected.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSaveDraft() {
    if (!payload) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await saveWikiDraftFn({
        data: {
          pageSlug: payload.slug,
          title: editTitle,
          markdown: editMarkdown,
          editSummary,
        },
      });
      await refreshPage(true);
      setNotice(`Draft v${saved.revNumber} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitForReview() {
    if (!payload) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const submitted = await submitWikiReviewFn({
        data: {
          pageSlug: payload.slug,
          title: editTitle,
          markdown: editMarkdown,
          editSummary: editSummary.trim() || "Updated page content",
        },
      });
      await refreshPage(true);
      setCompareRev(null);
      setTab("review");
      setNotice(`Revision v${submitted.revNumber} submitted for review.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit for review.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishDirect() {
    if (!payload) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const pub = await publishWikiRevisionFn({
        data: {
          pageSlug: payload.slug,
          revisionId: !dirty && workingDraft ? workingDraft.id : undefined,
          title: editTitle,
          markdown: editMarkdown,
          editSummary: editSummary.trim() || "Published update",
          reviewNote,
        },
      });
      await refreshPage(true);
      setCompareRev(null);
      setTab("read");
      setNotice(`Published v${pub.revNumber} live.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish page.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveReview() {
    if (!payload || !workingDraft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const pub = await publishWikiRevisionFn({
        data: {
          pageSlug: payload.slug,
          revisionId: workingDraft.id,
          reviewNote,
        },
      });
      await refreshPage(true);
      setCompareRev(null);
      setTab("read");
      setNotice(`Approved and published v${pub.revNumber} live.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve revision.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestChanges() {
    if (!workingDraft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const returned = await requestWikiChangesFn({
        data: {
          revisionId: workingDraft.id,
          reviewNote: reviewNote.trim() || "Please revise before publishing.",
        },
      });
      await refreshPage(true);
      setTab("edit");
      setNotice(`Returned v${returned.revNumber} to draft with reviewer feedback.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not return revision.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscardDraft() {
    if (!workingDraft || workingDraft.status !== "draft") return;
    if (!window.confirm(`Discard unpublished Draft v${workingDraft.revNumber}?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await discardWikiDraftFn({ data: { revisionId: workingDraft.id } });
      await refreshPage(true);
      setTab("read");
      setNotice("Draft discarded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not discard draft.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevert(rev: WikiRevisionRecord) {
    if (!payload) return;
    if (
      !window.confirm(
        `Revert live page "${payload.title}" to revision v${rev.revNumber}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const restored = await revertWikiPageFn({
        data: { pageSlug: payload.slug, targetRevisionId: rev.id },
      });
      await refreshPage(true);
      setCompareRev(null);
      setTab("read");
      setNotice(
        `Reverted page to v${rev.revNumber} (published as v${restored.revNumber}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revert page.");
    } finally {
      setBusy(false);
    }
  }

  if (loadingPage) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-6">
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface p-8" />
        </div>
      </SiteShell>
    );
  }

  if (!payload || !published) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6">
          <h1 className="font-display text-3xl font-semibold">Page not found</h1>
          <p className="mt-3 text-sm text-muted">
            This wiki page does not exist or has not been published yet.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-primary px-5 py-2 text-xs font-medium text-primary-fg"
          >
            Back to Home
          </Link>
        </main>
      </SiteShell>
    );
  }

  // Public visitor: zero CMS chrome, pure clean rendered page
  if (!actor) {
    return (
      <SiteShell>
        <main>
          <WikiMarkdownRenderer markdown={published.markdown} events={events} />
        </main>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      {/* Wikipedia-style Page Action Bar for Allowlisted Editors & Admins */}
      <div className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-6">
          <div role="tablist" aria-label="Page wiki mode" className="flex items-center gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "read"}
              onClick={() => {
                setCompareRev(null);
                setTab("read");
              }}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "read"
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-soft hover:text-fg",
              )}
            >
              <BookOpen className="size-3.5" />
              <span>Read</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "edit"}
              onClick={() => {
                if (!dirty && payload) syncEditorFromPayload(payload);
                setTab("edit");
              }}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "edit"
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-soft hover:text-fg",
              )}
            >
              <PencilLine className="size-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "review"}
              onClick={() => {
                setCompareRev(null);
                setTab("review");
              }}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "review"
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-soft hover:text-fg",
              )}
            >
              <FileDiff className="size-3.5" />
              <span>Review</span>
              {workingDraft && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    tab === "review"
                      ? "bg-surface/20 text-primary-fg"
                      : workingDraft.status === "in_review"
                        ? "bg-accent/15 text-accent"
                        : "bg-primary/15 text-primary",
                  )}
                >
                  {workingDraft.status === "in_review" ? "Pending" : "Draft"}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "history"}
              onClick={() => setTab("history")}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "history"
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-soft hover:text-fg",
              )}
            >
              <History className="size-3.5" />
              <span>History ({payload.revisions.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="hidden sm:inline">
              Live <strong className="text-fg">v{published.revNumber}</strong>
            </span>
            <Link
              to="/admin"
              search={{ tab: "site-content" }}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2.5 py-1 font-medium text-fg hover:border-primary"
            >
              <LayoutGrid className="size-3" />
              <span>All Pages</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Status banners */}
      {(error || notice || workingDraft?.reviewNote) && (
        <div className="mx-auto max-w-6xl space-y-2 px-5 pt-4 sm:px-6">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-xs font-medium text-accent">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs font-medium text-primary">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}
          {tab === "edit" && workingDraft?.reviewNote && (
            <div className="rounded-xl border border-accent/40 bg-soft px-4 py-3 text-xs text-fg">
              <span className="font-semibold text-accent">Reviewer feedback: </span>
              {workingDraft.reviewNote}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: READ */}
      {tab === "read" && (
        <main>
          {workingDraft && (
            <div className="mx-auto max-w-6xl px-5 pt-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-soft/70 px-4 py-2.5 text-xs">
                <span className="text-muted">
                  Viewing live <strong className="text-fg">v{published.revNumber}</strong>.
                  There is an unpublished{" "}
                  <strong className="text-fg">
                    {workingDraft.status === "in_review"
                      ? `Pending Review (v${workingDraft.revNumber})`
                      : `Draft (v${workingDraft.revNumber})`}
                  </strong>{" "}
                  by {workingDraft.authorEmail}.
                </span>
                <button
                  type="button"
                  onClick={() => setTab("review")}
                  className="font-semibold text-primary hover:underline"
                >
                  Review diff →
                </button>
              </div>
            </div>
          )}
          <WikiMarkdownRenderer markdown={published.markdown} events={events} />
        </main>
      )}

      {/* TAB 2: EDIT (Modern Markdown Studio) */}
      {tab === "edit" && (
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-soft/60 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1">
                <ToolbarBtn
                  title="Heading 2"
                  onClick={() => insertAtCursor("\n## ", "", "Section Heading")}
                >
                  <Heading2 className="size-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  title="Heading 3"
                  onClick={() => insertAtCursor("\n### ", "", "Subheading")}
                >
                  <Heading3 className="size-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  title="Bold"
                  onClick={() => insertAtCursor("**", "**", "bold text")}
                >
                  <Bold className="size-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  title="Italic"
                  onClick={() => insertAtCursor("*", "*", "italic text")}
                >
                  <Italic className="size-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  title="Link"
                  onClick={() => insertAtCursor("[", "](/about)", "Link label")}
                >
                  <Link2 className="size-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  title="Bullet list"
                  onClick={() => insertAtCursor("\n- ", "", "List item")}
                >
                  <List className="size-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  title="Insert Card Block"
                  onClick={() =>
                    insertAtCursor(
                      "\n:::card Card Title | Badge\n",
                      "\n:::\n",
                      "Card body text here.",
                    )
                  }
                >
                  <span className="px-1 text-[11px] font-semibold">Card</span>
                </ToolbarBtn>
                <ToolbarBtn
                  title="Insert Callout Block"
                  onClick={() =>
                    insertAtCursor(
                      "\n:::callout\n### Callout Heading\n\n",
                      "\n:::\n",
                      "Callout description.",
                    )
                  }
                >
                  <span className="px-1 text-[11px] font-semibold">Callout</span>
                </ToolbarBtn>
              </div>

              {/* Write / Split / Preview Switcher */}
              <div className="inline-flex rounded-lg border border-border bg-bg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setEditorLayout("write")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    editorLayout === "write"
                      ? "bg-primary text-primary-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setEditorLayout("split")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                    editorLayout === "split"
                      ? "bg-primary text-primary-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  <Columns2 className="size-3" />
                  <span>Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorLayout("preview")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                    editorLayout === "preview"
                      ? "bg-primary text-primary-fg"
                      : "text-muted hover:text-fg",
                  )}
                >
                  <Eye className="size-3" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Page Title Bar */}
            <div className="border-b border-border bg-bg/50 px-4 py-3">
              <label className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-muted uppercase">Page Title:</span>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setDirty(true);
                  }}
                  className="min-w-64 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg focus:border-primary focus:outline-none"
                />
                <span className="font-mono text-[11px] text-muted">{payload.path}</span>
              </label>
            </div>

            {/* Editor Panes */}
            <div
              className={cn(
                "grid min-h-[540px]",
                editorLayout === "split"
                  ? "divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0"
                  : "grid-cols-1",
              )}
            >
              {(editorLayout === "write" || editorLayout === "split") && (
                <div className="flex flex-col bg-bg">
                  <textarea
                    ref={textareaRef}
                    value={editMarkdown}
                    spellCheck
                    onChange={(e) => {
                      setEditMarkdown(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Write page content in Markdown…"
                    className="min-h-[520px] w-full flex-1 resize-y bg-transparent p-5 font-mono text-[13px] leading-relaxed text-fg focus:outline-none"
                  />
                </div>
              )}

              {(editorLayout === "preview" || editorLayout === "split") && (
                <div className="max-h-[680px] overflow-y-auto bg-bg/40">
                  <WikiMarkdownRenderer
                    markdown={editMarkdown}
                    events={events}
                    className="py-8"
                  />
                </div>
              )}
            </div>

            {/* Wikipedia-style Edit Summary & Publish Footer */}
            <div className="border-t border-border bg-soft/60 p-4 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-fg">
                    Edit summary{" "}
                    <span className="font-normal text-muted">
                      (briefly describe what you changed)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="e.g., Updated vision statement and added new research fellowship"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-fg focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSaveDraft()}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-fg hover:border-primary disabled:opacity-50"
                  >
                    <Save className="size-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSubmitForReview()}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-50"
                  >
                    <Send className="size-3.5" />
                    <span>Submit for Review</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handlePublishDirect()}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Publish Changes</span>
                    </button>
                  )}

                  {workingDraft?.status === "draft" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDiscardDraft()}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-muted hover:text-accent disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Discard</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* TAB 3: REVIEW (Line-by-Line Wikipedia/GitHub Diff + Approval) */}
      {tab === "review" && (
        <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-6">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {compareRev
                    ? `Comparing Live (v${published.revNumber}) → Historical v${compareRev.revNumber}`
                    : workingDraft
                      ? `Reviewing ${workingDraft.status === "in_review" ? "Pending Submission" : "Draft"} (v${workingDraft.revNumber}) vs Live (v${published.revNumber})`
                      : `No pending changes — Live v${published.revNumber}`}
                </h2>
                {activeReviewTarget && activeReviewTarget.id !== published.id && (
                  <p className="mt-1 text-xs text-muted">
                    Author: <strong className="text-fg">{activeReviewTarget.authorEmail}</strong>
                    {activeReviewTarget.editSummary && (
                      <>
                        {" "}
                        · Summary:{" "}
                        <em className="text-fg">“{activeReviewTarget.editSummary}”</em>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-700">
                    +{diffSummary.added}
                  </span>
                  <span className="rounded bg-red-500/15 px-2 py-0.5 text-red-700">
                    -{diffSummary.removed}
                  </span>
                </div>

                <div className="inline-flex rounded-lg border border-border bg-bg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setReviewMode("diff")}
                    className={cn(
                      "rounded-md px-3 py-1 font-medium",
                      reviewMode === "diff"
                        ? "bg-primary text-primary-fg"
                        : "text-muted hover:text-fg",
                    )}
                  >
                    Markdown Diff
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode("rendered")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-1 font-medium",
                      reviewMode === "rendered"
                        ? "bg-primary text-primary-fg"
                        : "text-muted hover:text-fg",
                    )}
                  >
                    <SquareSplitHorizontal className="size-3" />
                    <span>Rendered Preview</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Approval Controls when there is a workingDraft */}
            {!compareRev && workingDraft && isAdmin && (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Optional review note (e.g., Looks great / Please clarify section 2)…"
                  className="flex-1 rounded-lg border border-border bg-bg px-3.5 py-2 text-xs text-fg focus:border-primary focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRequestChanges()}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-50"
                  >
                    Request Changes
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleApproveReview()}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Approve &amp; Publish</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {diffSummary.added === 0 && diffSummary.removed === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted">
              No text differences between this revision and the currently published page.
            </div>
          ) : reviewMode === "diff" ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface font-mono text-xs">
              <div className="divide-y divide-border/50 overflow-x-auto">
                {diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "grid grid-cols-[44px_44px_24px_1fr] items-start py-1 pr-4 leading-relaxed",
                      line.kind === "added" && "bg-emerald-500/10 text-emerald-950",
                      line.kind === "removed" && "bg-red-500/10 text-red-950",
                      line.kind === "equal" && "text-muted",
                    )}
                  >
                    <span className="select-none pr-2 text-right text-[11px] opacity-55">
                      {line.oldLineNumber ?? ""}
                    </span>
                    <span className="select-none pr-2 text-right text-[11px] opacity-55">
                      {line.newLineNumber ?? ""}
                    </span>
                    <span className="select-none text-center font-bold">
                      {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}
                    </span>
                    <span className="whitespace-pre-wrap break-words">
                      {line.spans
                        ? line.spans.map((s, si) => (
                            <span
                              key={si}
                              className={cn(
                                s.kind === "added" &&
                                  "rounded-xs bg-emerald-500/30 px-0.5 font-semibold",
                                s.kind === "removed" &&
                                  "rounded-xs bg-red-500/30 px-0.5 line-through",
                              )}
                            >
                              {s.text}
                            </span>
                          ))
                        : line.text || " "}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface">
              <div className="border-b border-border bg-soft/60 px-5 py-2.5 text-xs font-semibold text-muted">
                Proposed Rendered Page Preview (v{activeReviewTarget?.revNumber})
              </div>
              <WikiMarkdownRenderer
                markdown={activeReviewTarget?.markdown ?? published.markdown}
                events={events}
              />
            </div>
          )}
        </main>
      )}

      {/* TAB 4: HISTORY (Wikipedia Revision Log) */}
      {tab === "history" && (
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border bg-soft/60 px-6 py-4">
              <h2 className="font-display text-xl font-semibold">
                Revision History: {payload.title}
              </h2>
              <p className="mt-1 text-xs text-muted">
                Every saved draft, review submission, and published update for{" "}
                <span className="font-mono">{payload.path}</span>.
              </p>
            </div>

            <div className="divide-y divide-border">
              {payload.revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-fg">
                        v{rev.revNumber}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          rev.status === "published" &&
                            "border-primary/30 bg-primary/10 text-primary",
                          rev.status === "in_review" &&
                            "border-accent/40 bg-accent/10 text-accent",
                          rev.status === "draft" &&
                            "border-border bg-soft text-fg",
                          rev.status === "archived" &&
                            "border-border bg-bg text-muted",
                        )}
                      >
                        {rev.status === "published"
                          ? "Live"
                          : rev.status === "in_review"
                            ? "Pending Review"
                            : rev.status}
                      </span>
                      <span className="text-muted">by {rev.authorEmail}</span>
                      <span className="text-muted">· {rev.updatedAt}</span>
                    </div>
                    {rev.editSummary && (
                      <p className="text-sm text-fg">“{rev.editSummary}”</p>
                    )}
                    {rev.reviewNote && (
                      <p className="text-muted">
                        Reviewer note ({rev.reviewedBy}): {rev.reviewNote}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {rev.id !== published.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompareRev(rev);
                          setTab("review");
                        }}
                        className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-bg px-3 py-1 font-medium text-fg hover:border-primary"
                      >
                        <FileDiff className="size-3" />
                        <span>Diff vs Live</span>
                      </button>
                    )}
                    {isAdmin && rev.status === "archived" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRevert(rev)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-surface px-3 py-1 font-medium text-primary hover:border-primary disabled:opacity-50"
                      >
                        <RotateCcw className="size-3" />
                        <span>Revert to v{rev.revNumber}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}
    </SiteShell>
  );
}

function ToolbarBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex size-8 min-w-8 items-center justify-center rounded-md text-fg transition-colors hover:bg-surface hover:text-primary"
    >
      {children}
    </button>
  );
}
