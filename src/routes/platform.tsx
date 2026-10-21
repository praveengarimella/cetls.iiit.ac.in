import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { data, getPage, t } from "@/lib/site-data";

export const Route = createFileRoute("/platform")({
  head: () => pageMetadata("platform"),
  component: PlatformPage,
});

function PlatformPage() {
  const ctaPath = getPage(data.platform.cta.pageId).path;
  const hasLinks = Boolean(
    data.platform.repoUrl || data.platform.docsUrl || data.platform.license,
  );

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <p className="text-sm font-medium tracking-wide text-accent uppercase">
          {t(data.platform.eyebrow)}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {t(data.platform.name)}
        </h1>
        {data.platform.description.map((paragraph, idx) => (
          <p
            key={idx}
            className={
              idx === 0
                ? "mt-6 text-xl leading-relaxed text-muted"
                : idx === 1
                  ? "mt-8 leading-relaxed text-muted"
                  : "mt-5 leading-relaxed text-muted"
            }
          >
            {t(paragraph)}
          </p>
        ))}

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.platform.audiencesHeading)}
          </h2>
          <ul className="mt-4 space-y-2 text-muted">
            {data.platform.audiences.map((aud) => (
              <li key={aud}>{t(aud)}</li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.platform.statusHeading)}
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            {t(data.platform.statusText)}
          </p>
          {hasLinks && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {data.platform.repoUrl && (
                <a
                  href={data.platform.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Source code →
                </a>
              )}
              {data.platform.docsUrl && (
                <a
                  href={data.platform.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Documentation →
                </a>
              )}
              {data.platform.license && (
                <span className="text-muted">Licence: {t(data.platform.license)}</span>
              )}
            </div>
          )}
        </section>

        <div className="mt-12 rounded-xl border border-border bg-surface p-6">
          <p className="font-medium">{t(data.platform.cta.heading)}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t(data.platform.cta.body)}
          </p>
          <Link
            to={ctaPath}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t(data.platform.cta.label)}
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
