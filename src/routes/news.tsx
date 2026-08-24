import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { newsItems } from "@/lib/content";

export const Route = createFileRoute("/news")({
  head: () => ({ meta: [{ title: "News | CETLS" }] }),
  component: NewsPage,
});

function NewsPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">News</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Announcements, events, and updates from the centre.
        </p>
        <div className="mt-12 space-y-6">
          {newsItems.map((n) => (
            <article key={n.title} className="rounded-xl border border-border bg-surface p-6">
              <p className="text-sm font-medium text-accent">{n.date}</p>
              <h2 className="mt-2 font-display text-xl font-semibold">{n.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{n.text}</p>
            </article>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}
