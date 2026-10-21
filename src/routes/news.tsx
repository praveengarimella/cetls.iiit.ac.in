import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { data, formatIsoDate, publishedNews, t } from "@/lib/site-data";

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
          {items.map((n) => (
            <article
              key={n.id}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <p className="font-medium text-accent">{formatIsoDate(n.date)}</p>
                {n.venue && <span className="text-muted">· {t(n.venue)}</span>}
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold">
                {t(n.title)}
              </h2>
              <p className="mt-3 leading-relaxed text-muted">{t(n.body)}</p>
            </article>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}
