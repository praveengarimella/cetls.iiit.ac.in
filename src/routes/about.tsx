import { createFileRoute, Link } from "@tanstack/react-router";
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

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Vision</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            A future in which every learner — from childhood through higher education, professional life, and the third age — has access to adaptive, engaging, and equitable learning experiences that are grounded in the science of how people learn.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Mission</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            The Centre for Educational Technology and Learning Sciences (CETLS) at IIIT Hyderabad advances rigorous research and design at the intersection of learning sciences, artificial intelligence, and educational technology. We focus on four domains across the lifespan — K-12 education, higher education, flexible learning for working professionals and executives, and third-age learning — developing solutions that are effective, inclusive, and scalable for India and the Global South, while contributing foundational knowledge to the global research community.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Our Approach</h2>
          <p className="mt-4 leading-relaxed text-muted">
            We combine the learning sciences with technology design and open infrastructure. Research is organised around four fundamental questions that apply across the lifespan:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">
            <li>What should be learned in the age of AI</li>
            <li>How teaching and facilitation should be designed</li>
            <li>How people learn most effectively with technology</li>
            <li>How progress, competence, and benefit should be understood and evaluated</li>
          </ul>
          <p className="mt-4 leading-relaxed text-muted">
            At the heart of our work is the Learning Middleware — an open technology layer that makes the tools of learning sciences available to educators, researchers, and institutions across all four domains.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Why IIIT Hyderabad</h2>
          <p className="mt-4 leading-relaxed text-muted">
            IIIT Hyderabad is structured around research centres rather than traditional departments. This model enables deep interdisciplinary work. CETLS builds on the institute’s strengths in artificial intelligence, human-computer interaction, language technologies, and flexible learning, while focusing these capabilities on the science and design of learning across the lifespan.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">International Advisory Committee</h2>
          <p className="mt-4 mb-4 leading-relaxed text-muted">
            The International Advisory Committee advises CETLS on research, design, and evidence at the meeting point of AI, educational technology, and the learning sciences. Members are Ashok K. Goel (Georgia Tech), Ryan S. Baker (Adelaide University / Penn), Matthew Kam (Google), and J. Derek Lomas (TU Delft).
          </p>
          <Link to="/advisory" className="font-medium text-accent hover:underline">
            Meet the committee →
          </Link>
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
