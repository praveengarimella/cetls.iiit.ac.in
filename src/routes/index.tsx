import { createFileRoute, Link } from "@tanstack/react-router";
import { AdvisoryList } from "@/components/advisory-list";
import { ChiefMentorHomeCard } from "@/components/person-card";
import { ProgrammesSection } from "@/components/programmes-section";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import {
  data,
  formatOrder,
  getDomains,
  getGroup,
  getPage,
  publishedMembers,
  t,
} from "@/lib/site-data";

export const Route = createFileRoute("/")({
  head: () => pageMetadata("home"),
  component: Home,
});

function Home() {
  const domains = getDomains();
  const chiefMentorGroup = getGroup("chief-mentor");
  const chiefMentors = publishedMembers("chief-mentor");
  const advisoryGroup = getGroup("advisory");
  const advisoryMembers = publishedMembers("advisory");
  const platformPath = getPage("platform").path;
  const peoplePath = getPage("people").path;
  const advisoryPath = getPage("advisory").path;
  const joinTeaserTarget = getPage(data.join.homeTeaser.pageId).path;

  return (
    <SiteShell>
      <main>
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium tracking-wide text-accent uppercase">
              {t(data.org.hero.eyebrow)}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {t(data.org.hero.headline)}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              {t(data.org.hero.summary)}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              {data.org.hero.ctas.map((cta) => {
                const targetPath = getPage(cta.pageId).path;
                const className =
                  cta.variant === "primary"
                    ? "inline-flex min-h-11 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
                    : cta.variant === "secondary"
                      ? "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-6 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                      : "inline-flex min-h-11 items-center px-3 py-3 text-sm font-medium text-primary";
                return (
                  <Link key={cta.pageId} to={targetPath} className={className}>
                    {t(cta.label)}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              {t(data.research.homeHeading)}
            </h2>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
              {t(data.research.homeIntro)}
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {domains.map((d) => (
                <Link
                  key={d.id}
                  to={d.path}
                  className="group rounded-xl border border-border bg-bg p-7 transition-shadow hover:border-primary hover:shadow-sm"
                >
                  <p className="text-sm font-medium text-accent">{formatOrder(d.order)}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold group-hover:text-accent">
                    {t(d.title)}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted">{t(d.summary)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="rounded-2xl bg-primary px-8 py-12 text-primary-fg sm:px-12 sm:py-14">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-wide uppercase opacity-80">
                {t(data.platform.homeEyebrow)}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold">
                {t(data.platform.name)}
              </h2>
              <p className="mt-5 text-lg leading-relaxed opacity-90">
                {t(data.platform.summary)}
              </p>
              <Link
                to={platformPath}
                className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-surface px-6 py-3 text-sm font-medium text-primary"
              >
                {t(data.platform.homeCtaLabel)}
              </Link>
            </div>
          </div>
        </section>

        {chiefMentors.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {chiefMentorGroup.homeEyebrow && (
                  <p className="mb-2 text-sm font-medium tracking-wide text-accent uppercase">
                    {t(chiefMentorGroup.homeEyebrow)}
                  </p>
                )}
                <h2 className="font-display text-3xl font-semibold">
                  {t(chiefMentorGroup.name)}
                </h2>
              </div>
              {chiefMentorGroup.homeCtaLabel && (
                <Link
                  to={peoplePath}
                  className="whitespace-nowrap font-medium text-accent hover:underline"
                >
                  {t(chiefMentorGroup.homeCtaLabel)}
                </Link>
              )}
            </div>
            <div className="space-y-6">
              {chiefMentors.map((member) => (
                <ChiefMentorHomeCard key={member.person.id} member={member} />
              ))}
            </div>
          </section>
        )}

        {advisoryMembers.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-3xl font-semibold">
                  {t(advisoryGroup.name)}
                </h2>
              </div>
              {advisoryGroup.homeCtaLabel && (
                <Link
                  to={advisoryPath}
                  className="whitespace-nowrap font-medium text-accent hover:underline"
                >
                  {t(advisoryGroup.homeCtaLabel)}
                </Link>
              )}
            </div>
            <AdvisoryList variant="strip" />
          </section>
        )}

        <ProgrammesSection variant="home" />

        <section className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                {t(data.join.homeTeaser.heading)}
              </h2>
              <p className="mt-2 text-muted">{t(data.join.homeTeaser.body)}</p>
            </div>
            <Link
              to={joinTeaserTarget}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg hover:bg-primary-hover"
            >
              {t(data.join.homeTeaser.ctaLabel)}
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
