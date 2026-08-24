import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/platform")({
  head: () => ({ meta: [{ title: "Learning Middleware | CETLS" }] }),
  component: PlatformPage,
});

function PlatformPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <p className="text-sm font-medium tracking-wide text-accent uppercase">
          Flagship platform
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          Learning Middleware
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-muted">
          A good deal of serious work in the learning sciences never leaves the project
          that produced it. The Learning Middleware is an open technology layer so that
          teachers, faculty, institutions, and researchers can actually use those
          methods.
        </p>

        <p className="mt-8 leading-relaxed text-muted">
          It will be released as open source. This is not a platform for its own sake.
          It is a way to lower the cost of doing evidence-based work, and to make the
          Centre’s research usable beyond IIIT Hyderabad.
        </p>
        <p className="mt-5 leading-relaxed text-muted">
          The middleware is intended to support work across schools, colleges and
          universities, professional and executive learning, and later life.
        </p>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">Who it serves</h2>
          <ul className="mt-4 space-y-2 text-muted">
            <li>Educators and instructional designers</li>
            <li>Researchers in learning sciences and educational technology</li>
            <li>Universities, schools, and training organisations</li>
            <li>Platform developers and open-source contributors</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Status</h2>
          <p className="mt-4 leading-relaxed text-muted">
            The middleware has been conceptualised and is being developed toward a
            general, open-source release. Detailed architecture, documentation, and
            early-adopter pathways will be published as the work matures.
          </p>
        </section>

        <div className="mt-12 rounded-xl border border-border bg-surface p-6">
          <p className="font-medium">Collaborate on the platform</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            We welcome early adopters, co-design partners, and contributors.
          </p>
          <Link to="/join" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Join Us →
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
