import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { data, getPage, t } from "@/lib/site-data";

export const Route = createFileRoute("/join")({
  head: () => pageMetadata("join"),
  component: JoinPage,
});

function JoinPage() {
  const contactPath = getPage(data.join.outro.pageId).path;

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {t(data.join.heading)}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {t(data.join.intro)}
        </p>

        <div className="mt-12 grid gap-5">
          {data.join.pathways.map((p) => (
            <section
              key={p.id}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <h2 className="font-display text-xl font-semibold">{t(p.title)}</h2>
              <p className="mt-2 leading-relaxed text-muted">{t(p.body)}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 leading-relaxed text-muted">
          {t(data.join.outro.prefix)}{" "}
          <Link to={contactPath} className="font-medium text-primary hover:underline">
            {t(data.join.outro.linkLabel)}
          </Link>
          {t(data.join.outro.suffix)}
        </p>
      </main>
    </SiteShell>
  );
}
