import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import type { pillars } from "@/lib/content";

type Pillar = (typeof pillars)[number];

export function PillarPage({ pillar }: { pillar: Pillar }) {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <Link
          to="/research"
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="size-4" />
          Research
        </Link>
        <p className="text-sm font-medium tracking-wide text-accent uppercase">{pillar.number}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{pillar.title}</h1>
        <p className="mt-5 text-xl leading-relaxed text-muted">{pillar.card}</p>
        <p className="mt-8 leading-relaxed text-muted">{pillar.intro}</p>
        <p className="mt-5 leading-relaxed text-muted">{pillar.body}</p>

        <div className="mt-14 space-y-12">
          {pillar.dimensions.map((d) => (
            <section key={d.title}>
              <h2 className="font-display text-2xl font-semibold">{d.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{d.text}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Supported by</p>
          <Link to="/platform" className="mt-1 inline-block font-medium text-primary hover:underline">
            Learning Middleware →
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
