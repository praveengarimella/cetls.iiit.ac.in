import { Link } from "@tanstack/react-router";
import { getPage, publishedMembers, t } from "@/lib/site-data";

export function AdvisoryList({
  variant,
  withAnchors = false,
  headingLevel = "h2",
}: {
  variant: "strip" | "inline" | "full";
  withAnchors?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const members = publishedMembers("advisory");
  const advisoryPath = getPage("advisory").path;

  if (members.length === 0) return null;

  if (variant === "inline") {
    const formatted = members
      .map((m) =>
        m.person.shortAffiliation
          ? `${m.person.name} (${t(m.person.shortAffiliation)})`
          : m.person.name,
      )
      .join(", ")
      .replace(/, ([^,]*)$/, ", and $1");
    return <>Members are {formatted}.</>;
  }

  if (variant === "strip") {
    return (
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {members.map(({ person }) => (
          <Link key={person.id} to={advisoryPath} hash={person.id} className="group block">
            {person.photo && (
              <img
                src={person.photo}
                alt={person.name}
                className="mb-3 aspect-square w-full rounded-xl border border-border object-cover object-top"
              />
            )}
            <div className="font-semibold transition group-hover:text-accent">{person.name}</div>
            {person.shortAffiliation && (
              <div className="text-sm text-muted">{t(person.shortAffiliation)}</div>
            )}
          </Link>
        ))}
      </div>
    );
  }

  const HeadingTag = headingLevel;

  return (
    <div className="space-y-8">
      {members.map(({ person }) => (
        <article
          key={person.id}
          id={withAnchors ? person.id : undefined}
          className="rounded-2xl border border-border bg-surface p-6 sm:p-8 scroll-mt-24"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
            {person.photo && (
              <img
                src={person.photo}
                alt={person.name}
                className="h-32 w-32 shrink-0 rounded-xl bg-border object-cover object-top sm:h-36 sm:w-36"
              />
            )}
            <div>
              <HeadingTag className="mb-1 font-display text-2xl font-semibold">
                {person.name}
              </HeadingTag>
              {person.headline && <p className="font-medium">{t(person.headline)}</p>}
              {person.subtitleLines.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                  {person.subtitleLines.map((line, idx) => (
                    <span key={idx}>
                      {idx > 0 && <br />}
                      {t(line)}
                    </span>
                  ))}
                </p>
              )}
              {person.bio && (
                <p className="mt-4 leading-relaxed text-muted">{t(person.bio)}</p>
              )}
              {person.links
                .filter((l) => Boolean(l.url))
                .map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(link.label)}
                  </a>
                ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
