import { createFileRoute, Link } from "@tanstack/react-router";
import { AdvisoryList } from "@/components/advisory-list";
import { ProgrammesSection } from "@/components/programmes-section";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import {
  data,
  getGroup,
  getPage,
  getResearchQuestions,
  getRoadmapPhases,
  publishedMembers,
  t,
} from "@/lib/site-data";
import type { RoadmapProgress } from "@/lib/site-data.types";

export const Route = createFileRoute("/about")({
  head: () => pageMetadata("about"),
  component: AboutPage,
});

const PROGRESS_BADGE: Record<RoadmapProgress, { label: string; className: string }> = {
  done: {
    label: "Completed",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  "in-progress": {
    label: "In Progress",
    className: "border-accent/30 bg-accent/10 text-accent",
  },
  planned: {
    label: "Planned",
    className: "border-border bg-soft text-muted",
  },
};

function AboutPage() {
  const aboutPage = getPage("about");
  const advisoryPath = getPage("advisory").path;
  const inauguralPath = getPage("inaugural").path;
  const advisoryGroup = getGroup("advisory");
  const advisoryMembers = publishedMembers("advisory");
  const questions = getResearchQuestions();
  const phases = getRoadmapPhases();

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {t(aboutPage.title)}
        </h1>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.org.vision.heading)}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            {t(data.org.vision.value)}
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.org.mission.heading)}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            {t(data.org.mission.value)}
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.org.approach.heading)}
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            {t(data.org.approach.intro)}
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">
            {questions.map((q) => (
              <li key={q.id}>{t(q.label)}</li>
            ))}
          </ul>
          <p className="mt-4 leading-relaxed text-muted">
            {t(data.org.approach.outro)}
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.org.whyIiith.heading)}
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            {t(data.org.whyIiith.value)}
          </p>
        </section>

        {advisoryMembers.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">
              {t(advisoryGroup.name)}
            </h2>
            <p className="mt-4 mb-4 leading-relaxed text-muted">
              {t(advisoryGroup.summary)} <AdvisoryList variant="inline" />
            </p>
            {advisoryGroup.homeCtaLabel && (
              <Link to={advisoryPath} className="font-medium text-accent hover:underline">
                {t(advisoryGroup.homeCtaLabel)}
              </Link>
            )}
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {t(data.roadmap.heading)}
          </h2>
          <p className="mt-4 leading-relaxed text-muted">{t(data.roadmap.intro)}</p>
          <div className="mt-6 space-y-4">
            {phases.map((phase) => {
              const badge = PROGRESS_BADGE[phase.progress];
              return (
                <div
                  key={phase.id}
                  className="rounded-lg border border-border bg-surface p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-accent">{t(phase.title)}</p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {t(phase.body)}
                  </p>
                  {phase.id === "phase-1" && data.news.items[0]?.ctaLabel && (
                    <div className="mt-3">
                      <Link
                        to={inauguralPath}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t(data.news.items[0].ctaLabel)} →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <ProgrammesSection variant="about" />
      </main>
    </SiteShell>
  );
}
