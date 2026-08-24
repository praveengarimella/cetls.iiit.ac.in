import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { joinPaths } from "@/lib/content";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Join Us | CETLS" }] }),
  component: JoinPage,
});

function JoinPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Join Us</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Whether you are a researcher, student, educator, policymaker, or innovator,
          there are many ways to engage with CETLS.
        </p>

        <div className="mt-12 grid gap-5">
          {joinPaths.map((p) => (
            <section key={p.title} className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 leading-relaxed text-muted">
          To express interest, write to us via the{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            contact page
          </Link>
          . Please include a short note about how you would like to engage.
        </p>
      </main>
    </SiteShell>
  );
}
