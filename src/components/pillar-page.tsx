import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { data, formatOrder, getDomain, getPage, t } from "@/lib/site-data";

export function PillarPage({ domainId }: { domainId: string }) {
  const domain = getDomain(domainId);
  const researchPage = getPage("research");
  const platformPage = getPage("platform");

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <Link
          to={researchPage.path}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="size-4" />
          {t(researchPage.title)}
        </Link>
        <p className="text-sm font-medium tracking-wide text-accent uppercase">
          {formatOrder(domain.order)}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          {t(domain.title)}
        </h1>
        <p className="mt-5 text-xl leading-relaxed text-muted">{t(domain.summary)}</p>
        {domain.context.map((paragraph, idx) => (
          <p
            key={idx}
            className={idx === 0 ? "mt-8 leading-relaxed text-muted" : "mt-5 leading-relaxed text-muted"}
          >
            {t(paragraph)}
          </p>
        ))}

        <div className="mt-14 space-y-12">
          {domain.questions.map((q) => (
            <section key={q.questionId}>
              <h2 className="font-display text-2xl font-semibold">{t(q.heading)}</h2>
              <p className="mt-3 leading-relaxed text-muted">{t(q.body)}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Supported by</p>
          <Link
            to={platformPage.path}
            className="mt-1 inline-block font-medium text-primary hover:underline"
          >
            {t(data.platform.name)} →
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
