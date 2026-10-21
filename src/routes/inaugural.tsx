import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import {
  data,
  formatIsoDate,
  getDomain,
  getPage,
  getPerson,
  t,
} from "@/lib/site-data";

export const Route = createFileRoute("/inaugural")({
  head: () => pageMetadata("inaugural"),
  component: InauguralPage,
});

function InauguralPage() {
  const { inaugural } = data;
  const advisoryPath = getPage("advisory").path;
  const joinPath = getPage("join").path;
  const contactPath = getPage("contact").path;
  const signatories = inaugural.signOff.signatories.map((id) => getPerson(id));

  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-5 py-14 sm:px-6 sm:py-16">
        {/* Masthead */}
        <header className="border-b border-border pb-10">
          <p className="text-xs font-medium tracking-widest text-accent uppercase">
            {t(inaugural.eyebrow)}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {t(inaugural.title)}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="font-medium text-fg">{t(inaugural.subtitle)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={inaugural.date}>{formatIsoDate(inaugural.date)}</time>
          </div>
          <p className="mt-6 text-lg leading-relaxed text-fg sm:text-xl">
            {t(inaugural.lead)}
          </p>
        </header>

        {/* Optional Photo Gallery (renders automatically when photos are added to inaugural.gallery) */}
        {inaugural.gallery.length > 0 && (
          <section className="mt-10 border-b border-border pb-10">
            <div
              className={`grid gap-5 ${
                inaugural.gallery.length === 1
                  ? "grid-cols-1"
                  : "sm:grid-cols-2"
              }`}
            >
              {inaugural.gallery.map((photo) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <img
                    src={photo.src}
                    alt={t(photo.alt)}
                    className="aspect-16/10 w-full object-cover"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <figcaption className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted">
                      {t(photo.caption)}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 1. Background */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(inaugural.background.heading)}
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-muted">
            {inaugural.background.paragraphs.map((para, idx) => (
              <p key={idx}>{t(para)}</p>
            ))}
          </div>
        </section>

        {/* 2. Inaugural */}
        <section className="mt-12 border-t border-border pt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(inaugural.event.heading)}
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-muted">
            <p>
              {t(inaugural.event.pressCoverage.prefix)}
              <a
                href={inaugural.event.pressCoverage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 hover:text-accent"
              >
                {t(inaugural.event.pressCoverage.label)}
                <ExternalLink className="size-3.5" />
              </a>
              {t(inaugural.event.pressCoverage.suffix)}
            </p>
            {inaugural.event.paragraphs.map((para, idx) => (
              <p key={idx}>{t(para)}</p>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <p className="font-display text-base font-semibold text-fg">
              {t(inaugural.event.questionsIntro)}
            </p>
            <ol className="mt-5 space-y-4">
              {inaugural.event.questions.map((q, idx) => (
                <li
                  key={idx}
                  className="flex gap-4 rounded-xl border border-border bg-bg p-4 sm:p-5"
                >
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted sm:text-base">
                    {t(q)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3. Programme areas */}
        <section className="mt-12 border-t border-border pt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(inaugural.programmeAreas.heading)}
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            {t(inaugural.programmeAreas.intro)}
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {inaugural.programmeAreas.items.map((area) => {
              const domain = getDomain(area.domainId);
              return (
                <article
                  key={area.domainId}
                  className="flex flex-col justify-between rounded-xl border border-border bg-surface p-6"
                >
                  <div>
                    <h3 className="font-display text-lg font-semibold text-fg">
                      {t(area.title)}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {t(area.body)}
                    </p>
                  </div>
                  <div className="mt-5 border-t border-border pt-3">
                    <Link
                      to={domain.path}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-accent"
                    >
                      {t(domain.title)} <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 4. Advisers, faculty and support */}
        <section className="mt-12 border-t border-border pt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(inaugural.advisersAndSupport.heading)}
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            {t(inaugural.advisersAndSupport.advisersIntro)}
          </p>
          <ul className="mt-5 space-y-3">
            {inaugural.advisersAndSupport.advisers.map((adv) => (
              <li
                key={adv.personId}
                className="rounded-xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted"
              >
                <Link
                  to={advisoryPath}
                  hash={adv.personId}
                  className="font-semibold text-fg hover:text-primary"
                >
                  {t(adv.name)}
                </Link>
                {", "}
                <span>{t(adv.affiliation)}</span>
                {": "}
                <span className="font-medium text-fg">{t(adv.focus)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 leading-relaxed text-muted">
            {t(inaugural.advisersAndSupport.supportBody)}
          </p>
        </section>

        {/* 5. Collaborators sought */}
        <section className="mt-12 border-t border-border pt-12">
          <div className="rounded-2xl border border-border bg-soft p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold">
              {t(inaugural.collaboratorsSought.heading)}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              {t(inaugural.collaboratorsSought.body)}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={joinPath}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-fg transition-colors hover:bg-primary-hover"
              >
                {t(getPage("join").title)} <ArrowRight className="size-3.5" />
              </Link>
              <Link
                to={contactPath}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-fg transition-colors hover:border-primary hover:text-primary"
              >
                {t(getPage("contact").title)}
              </Link>
            </div>
          </div>
        </section>

        {/* Sign-off */}
        <footer className="mt-12 border-t border-border pt-8">
          <p className="font-display text-base font-semibold text-fg">
            {signatories.map((p) => p.name).join(" and ")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(inaugural.signOff.organizationLine)}
          </p>
        </footer>
      </main>
    </SiteShell>
  );
}
