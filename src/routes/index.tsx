import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { pillars } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "CETLS | Centre for Education Technology and Learning Sciences" }],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteShell>
      <main>
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium tracking-wide text-accent uppercase">
              Centre for Education Technology and Learning Sciences
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              How people learn, and how learning should be designed
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              From school through working life and into later years. A research centre at
              IIIT Hyderabad — not another set of classroom tools, but work on the
              questions that decide whether a system actually improves.
            </p>
            <p className="mt-4 text-sm font-medium text-accent">
              Inauguration · 5 September 2026 · IIIT Hyderabad
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/research"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
              >
                Explore Research
              </Link>
              <Link
                to="/platform"
                className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-6 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                Explore the Platform
              </Link>
              <Link
                to="/join"
                className="inline-flex min-h-11 items-center px-3 py-3 text-sm font-medium text-primary"
              >
                Join Us →
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Research across the lifespan
            </h2>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
              The same questions run through all of the Centre’s work: what is worth
              learning, how teaching should change, how people learn once technology is
              in the room, and how we can tell, honestly, whether any of this has helped.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {pillars.map((p) => (
                <Link
                  key={p.slug}
                  to={p.href}
                  className="group rounded-xl border border-border bg-bg p-7 transition-shadow hover:border-primary hover:shadow-sm"
                >
                  <p className="text-sm font-medium text-accent">{p.number}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold group-hover:text-accent">
                    {p.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted">{p.card}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="rounded-2xl bg-primary px-8 py-12 text-primary-fg sm:px-12 sm:py-14">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-wide uppercase opacity-80">
                Flagship Platform
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold">Learning Middleware</h2>
              <p className="mt-5 text-lg leading-relaxed opacity-90">
                An open technology layer so that teachers, faculty, institutions, and
                researchers can actually use the methods of the learning sciences. Not a
                platform for its own sake — a way to lower the cost of evidence-based work,
                released as open source.
              </p>
              <Link
                to="/platform"
                className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-surface px-6 py-3 text-sm font-medium text-primary"
              >
                Learn more about the Platform →
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">Join the Centre</h2>
              <p className="mt-2 text-muted">
                Whether you are a researcher, student, educator, or partner — there are
                many ways to engage with CETLS.
              </p>
            </div>
            <Link
              to="/join"
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg hover:bg-primary-hover"
            >
              Explore Opportunities
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
