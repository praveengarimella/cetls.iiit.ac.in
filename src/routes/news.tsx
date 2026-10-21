import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { data, formatIsoDate, getPage, publishedNews, t } from "@/lib/site-data";

export const Route = createFileRoute("/news")({
  head: () => pageMetadata("news"),
  component: NewsPage,
});

function NewsPage() {
  const items = publishedNews();

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {t(data.news.heading)}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {t(data.news.intro)}
        </p>
        <div className="mt-12 space-y-6">
          {items.map((n) => {
            const targetPath = n.pageId ? getPage(n.pageId).path : null;
            return (
              <article
                key={n.id}
                className="rounded-xl border border-border bg-surface p-6"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <p className="font-medium text-accent">{formatIsoDate(n.date)}</p>
                  {n.venue && <span className="text-muted">· {t(n.venue)}</span>}
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold">
                  {targetPath ? (
                    <Link to={targetPath} className="hover:text-primary">
                      {t(n.title)}
                    </Link>
                  ) : (
                    t(n.title)
                  )}
                </h2>
                <p className="mt-3 leading-relaxed text-muted">{t(n.body)}</p>
                {(targetPath || n.externalUrl) && (
                  <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs font-medium">
                    {targetPath && n.ctaLabel && (
                      <Link
                        to={targetPath}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-accent"
                      >
                        {t(n.ctaLabel)} <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                    {n.externalUrl && n.externalLabel && (
                      <a
                        href={n.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted hover:text-primary"
                      >
                        {t(n.externalLabel)} <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </SiteShell>
  );
}
