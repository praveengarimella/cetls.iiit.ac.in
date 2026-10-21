import { data, publishedProgrammes, t } from "@/lib/site-data";

export function ProgrammesSection({ variant = "home" }: { variant?: "home" | "about" }) {
  const items = publishedProgrammes();
  if (items.length === 0) return null;

  if (variant === "about") {
    return (
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">{t(data.programmes.heading)}</h2>
        <p className="mt-4 leading-relaxed text-muted">{t(data.programmes.summary)}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-surface p-5">
              <p className="font-medium text-fg">{t(item.name)}</p>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted">{t(item.description)}</p>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Learn more →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20">
      <h2 className="font-display text-3xl font-semibold">{t(data.programmes.heading)}</h2>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">
        {t(data.programmes.summary)}
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-display text-lg font-semibold">{t(item.name)}</h3>
            {item.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(item.description)}</p>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
              >
                Learn more →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
