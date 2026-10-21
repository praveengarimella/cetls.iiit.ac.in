import { createFileRoute } from "@tanstack/react-router";
import { AdvisoryList } from "@/components/advisory-list";
import { PersonProfileCard } from "@/components/person-card";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { getPage, publishedGroups, t } from "@/lib/site-data";

export const Route = createFileRoute("/people")({
  head: () => pageMetadata("people"),
  component: PeoplePage,
});

function PeoplePage() {
  const peoplePage = getPage("people");
  const groups = publishedGroups();

  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="mb-12 font-display text-4xl font-semibold tracking-tight">
          {t(peoplePage.title)}
        </h1>

        {groups.map((group) => (
          <section key={group.id} className="mb-16">
            <h2
              className={
                group.peopleIntro
                  ? "mb-3 font-display text-2xl font-semibold"
                  : "mb-6 font-display text-2xl font-semibold"
              }
            >
              {t(group.name)}
            </h2>
            {group.peopleIntro && (
              <p className="mb-8 max-w-3xl leading-relaxed text-muted">
                {t(group.peopleIntro)}
              </p>
            )}
            {group.id === "advisory" ? (
              <AdvisoryList variant="full" headingLevel="h3" />
            ) : (
              <div className="space-y-8">
                {group.publishedMembers.map((member) => (
                  <PersonProfileCard key={member.person.id} member={member} />
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </SiteShell>
  );
}
