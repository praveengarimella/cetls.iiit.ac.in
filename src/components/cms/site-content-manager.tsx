import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileDiff,
  FilePlus2,
  History,
  PencilLine,
} from "lucide-react";
import type { EventUserRole } from "@/lib/events/types";
import { cn } from "@/lib/utils";
import type { WikiPageSummary } from "@/lib/wiki/types";
import { createCustomWikiPageFn, listWikiPagesFn } from "@/lib/wiki/wiki-api";

interface SiteContentManagerProps {
  actorRole: EventUserRole;
  actorEmail: string;
}

export function SiteContentManager({ actorRole }: SiteContentManagerProps) {
  const navigate = useNavigate();
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewPage, setShowNewPage] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listWikiPagesFn();
      setPages(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wiki pages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const pendingReviews = pages.filter(
    (p) => p.pendingRevision?.status === "in_review",
  );
  const activeDrafts = pages.filter(
    (p) => p.pendingRevision?.status === "draft",
  );

  function goToPageMode(
    path: string,
    mode?: "edit" | "review" | "history",
  ) {
    const url = mode ? `${path}?mode=${mode}` : path;
    window.location.href = url;
  }

  async function handleCreatePage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await createCustomWikiPageFn({
        data: {
          slug: newSlug,
          title: newTitle,
          markdown: `# ${newTitle.trim() || newSlug.trim()}\n\nStart writing this page in Markdown…`,
        },
      });
      setShowNewPage(false);
      setNewSlug("");
      setNewTitle("");
      await navigate({ to: created.path });
      window.location.href = `${created.path}?mode=edit`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create page.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="h-36 animate-pulse rounded-2xl border border-border bg-surface p-8" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Wiki Pages &amp; Review Queue
          </h2>
          <p className="mt-1 text-xs text-muted">
            Every content page has an in-page{" "}
            <strong className="text-fg">Read · Edit · Review · History</strong> bar
            when you are signed in. Edit pages directly in Markdown with live preview
            and line-by-line diffs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewPage((v) => !v)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
        >
          <FilePlus2 className="size-4" />
          <span>New Markdown Page</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-accent/50 bg-accent/10 p-4 text-xs font-medium text-accent">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New Custom Page Form */}
      {showNewPage && (
        <form
          onSubmit={handleCreatePage}
          className="rounded-2xl border border-primary/30 bg-surface p-6"
        >
          <h3 className="font-display text-lg font-semibold">
            Create New Markdown Page
          </h3>
          <p className="mt-1 text-xs text-muted">
            Creates a new wiki page at <span className="font-mono">/pages/&lt;slug&gt;</span>{" "}
            and opens the Markdown editor.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-semibold text-fg">Page Title</span>
              <input
                required
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (!newSlug) {
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                  }
                }}
                placeholder="e.g., 2027 Research Fellowship"
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
              />
            </label>

            <label className="block text-xs">
              <span className="font-semibold text-fg">URL Slug</span>
              <div className="mt-1 flex items-center rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted">/pages/</span>
                <input
                  required
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="research-fellowship-2027"
                  className="w-full bg-transparent font-mono text-sm text-fg focus:outline-none"
                />
              </div>
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewPage(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-muted hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create & Open Editor →"}
            </button>
          </div>
        </form>
      )}

      {/* Pending Review Queue */}
      {pendingReviews.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-accent/40 bg-accent/5">
          <div className="flex items-center justify-between border-b border-accent/20 px-6 py-3.5">
            <div className="flex items-center gap-2">
              <FileDiff className="size-4 text-accent" />
              <h3 className="text-sm font-semibold text-fg">
                Awaiting Review ({pendingReviews.length})
              </h3>
            </div>
            <span className="text-xs text-muted">
              {actorRole === "admin"
                ? "Inspect line-by-line diffs and approve"
                : "Submitted for admin approval"}
            </span>
          </div>
          <div className="divide-y divide-border/60 bg-surface">
            {pendingReviews.map((p) => (
              <div
                key={p.slug}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-fg">{p.title}</span>
                    <span className="font-mono text-xs text-muted">{p.path}</span>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      v{p.pendingRevision?.revNumber} Pending
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    By {p.pendingRevision?.authorEmail}
                    {p.pendingRevision?.editSummary && (
                      <> — “{p.pendingRevision.editSummary}”</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goToPageMode(p.path, "review")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
                >
                  <FileDiff className="size-3.5" />
                  <span>Review Diff &amp; Publish →</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Drafts Notice */}
      {activeDrafts.length > 0 && (
        <div className="rounded-xl border border-border bg-soft/60 px-5 py-3 text-xs text-muted">
          <strong className="text-fg">{activeDrafts.length} page(s)</strong> currently
          have saved work-in-progress drafts:{" "}
          {activeDrafts.map((d, idx) => (
            <span key={d.slug}>
              {idx > 0 && ", "}
              <button
                type="button"
                onClick={() => goToPageMode(d.path, "edit")}
                className="font-medium text-primary hover:underline"
              >
                {d.title}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* All Pages Directory */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-soft/50 px-6 py-3.5">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            All Site Wiki Pages ({pages.length})
          </h3>
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <CheckCircle2 className="size-3.5 text-primary" />
            Click Edit to open that page’s Markdown studio
          </span>
        </div>

        <div className="divide-y divide-border">
          {pages.map((page) => (
            <div
              key={page.slug}
              className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-soft/30"
            >
              <div className="min-w-56">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPageMode(page.path)}
                    className="font-display text-base font-semibold text-fg hover:text-primary"
                  >
                    {page.title}
                  </button>
                  <span className="font-mono text-xs text-muted">{page.path}</span>
                  {page.publishedRevNumber && (
                    <span className="rounded bg-soft px-2 py-0.5 font-mono text-[11px] text-muted">
                      Live v{page.publishedRevNumber}
                    </span>
                  )}
                  {page.isCustom && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted">
                      Custom Page
                    </span>
                  )}
                  {page.pendingRevision && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        page.pendingRevision.status === "in_review"
                          ? "bg-accent/15 text-accent"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {page.pendingRevision.status === "in_review"
                        ? `v${page.pendingRevision.revNumber} In Review`
                        : `v${page.pendingRevision.revNumber} Draft`}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => goToPageMode(page.path)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 font-medium text-fg hover:border-primary"
                >
                  <BookOpen className="size-3.5" />
                  <span>Read</span>
                </button>
                <button
                  type="button"
                  onClick={() => goToPageMode(page.path, "edit")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-semibold text-primary-fg hover:bg-primary-hover"
                >
                  <PencilLine className="size-3.5" />
                  <span>Edit</span>
                </button>
                {page.pendingRevision && (
                  <button
                    type="button"
                    onClick={() => goToPageMode(page.path, "review")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 font-semibold text-accent hover:bg-accent/20"
                  >
                    <FileDiff className="size-3.5" />
                    <span>Review</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goToPageMode(page.path, "history")}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-muted hover:text-fg"
                  title="Revision history"
                >
                  <History className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
