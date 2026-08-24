import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { approaches, pillars } from "@/lib/content";

export const Route = createFileRoute("/research/")({
  head: () => ({ meta: [{ title: "Research | CETLS" }] }),
  component: ResearchPage,
});

function ResearchPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Research</h1>
          <p className="mt-5 text-xl leading-relaxed text-muted">
            The same questions run through all of the Centre’s work, at every stage of
            life. What is worth learning. How teaching should change. How people learn
            once technology is in the room. How we can tell, honestly, whether any of
            this has helped.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {pillars.map((p) => (
            <Link
              key={p.slug}
              to={p.href}
              className="group rounded-xl border border-border bg-surface p-7 transition-shadow hover:border-primary hover:shadow-sm"
            >
              <p className="text-sm font-medium text-accent">{p.number}</p>
              <h2 className="mt-2 font-display text-xl font-semibold group-hover:text-accent">
                {p.title}
              </h2>
              <p className="mt-3 leading-relaxed text-muted">{p.card}</p>
            </Link>
          ))}
        </div>

        <section className="mt-16 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold">Cross-cutting approaches</h2>
          <p className="mt-3 text-muted">Across all four domains we draw on:</p>
          <ul className="mt-4 space-y-3 text-muted">
            {approaches.map((a) => (
              <li key={a} className="flex gap-3">
                <span className="text-primary">•</span>
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-6 leading-relaxed text-muted">
            These approaches are supported by the{" "}
            <Link to="/platform" className="font-medium text-primary hover:underline">
              Learning Middleware
            </Link>
            , our open infrastructure for the science and design of learning.
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
