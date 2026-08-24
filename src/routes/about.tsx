import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { roadmap } from "@/lib/content";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About | CETLS" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">About CETLS</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          IIIT Hyderabad is establishing CETLS as a research centre on how people learn,
          and on how learning should be designed, from school through working life and
          into later years.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Why a centre of this kind</h2>
          <p className="mt-4 leading-relaxed text-muted">
            The reason is not another set of classroom tools. Education systems are
            already under pressure from AI, and most of the response so far has been
            products: tutors, graders, content generators. Those can be useful. They do
            not answer the questions that actually decide whether a system improves.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            CETLS exists to work on those questions in Indian conditions, and to put the
            results into forms that others can use.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">What we are trying to do</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Learning that is adaptive, engaging, and fair, and that is based on evidence
            rather than fashion. The work sits where the learning sciences, artificial
            intelligence, and educational technology meet.
          </p>
          <p className="mt-4 leading-relaxed text-muted">We will judge it by three tests:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">
            <li>whether it is rigorous</li>
            <li>whether it can be used at scale in India and the Global South</li>
            <li>whether it adds anything the field does not already know</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">The questions</h2>
          <p className="mt-4 leading-relaxed text-muted">
            The same questions run through all of the Centre’s work, at every stage of
            life:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">
            <li>What is worth learning when machines can already do a great deal of the old work</li>
            <li>How teaching should change</li>
            <li>How people learn once technology is in the room</li>
            <li>How we can tell, honestly, whether any of this has helped</li>
          </ul>
          <p className="mt-4 leading-relaxed text-muted">
            Those are research questions. AI is not merely a new set of tools.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Why IIIT Hyderabad</h2>
          <p className="mt-4 leading-relaxed text-muted">
            IIIT Hyderabad is structured around research centres rather than traditional
            departments. This model enables deep interdisciplinary work. CETLS builds on
            the institute’s strengths in artificial intelligence, language technologies,
            and software, and turns them toward the science and design of learning.
            Prof. Sandeep Kumar Shukla is Director of the Institute.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Roadmap</h2>
          <p className="mt-4 leading-relaxed text-muted">
            As a new centre, we are deliberately transparent about our growth path:
          </p>
          <div className="mt-6 space-y-4">
            {roadmap.map((r) => (
              <div key={r.phase} className="rounded-lg border border-border bg-surface p-5">
                <p className="font-medium text-accent">{r.phase}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
