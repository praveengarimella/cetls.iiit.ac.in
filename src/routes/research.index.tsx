import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { data, formatOrder, getDomains, getPage, t } from "@/lib/site-data";

export const Route = createFileRoute("/research/")({
  head: () => pageMetadata("research"),
  component: ResearchPage,
});

function ResearchPage() {
  const domains = getDomains();
  const platformPath = getPage("platform").path;

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {t(data.research.pageHeading)}
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-muted">
            {t(data.research.pageIntro)}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {domains.map((d) => (
            <Link
              key={d.id}
              to={d.path}
              className="group rounded-xl border border-border bg-surface p-7 transition-shadow hover:border-primary hover:shadow-sm"
            >
              <p className="text-sm font-medium text-accent">{formatOrder(d.order)}</p>
              <h2 className="mt-2 font-display text-xl font-semibold group-hover:text-accent">
                {t(d.title)}
              </h2>
              <p className="mt-3 leading-relaxed text-muted">{t(d.summary)}</p>
            </Link>
          ))}
        </div>

        <section className="mt-16 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.research.crossCutting.heading)}
          </h2>
          <p className="mt-3 text-muted">{t(data.research.crossCutting.intro)}</p>
          <ul className="mt-4 space-y-3 text-muted">
            {data.research.crossCutting.items.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-primary">•</span>
                {t(item)}
              </li>
            ))}
          </ul>
          <p className="mt-6 leading-relaxed text-muted">
            {t(data.research.crossCutting.outroPrefix)}{" "}
            <Link to={platformPath} className="font-medium text-primary hover:underline">
              {t(data.platform.name)}
            </Link>
            {t(data.research.crossCutting.outroSuffix)}
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
