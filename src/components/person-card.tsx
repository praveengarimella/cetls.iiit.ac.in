import { Link } from "@tanstack/react-router";
import type { PublishedGroupMember } from "@/lib/site-data";
import { getPage, t } from "@/lib/site-data";

export function ChiefMentorHomeCard({ member }: { member: PublishedGroupMember }) {
  const { person } = member;
  const peoplePath = getPage("people").path;

  return (
    <Link
      to={peoplePath}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary"
    >
      <div className="flex flex-col sm:flex-row">
        {person.photo && (
          <img
            src={person.photo}
            alt={person.name}
            className="h-48 w-full shrink-0 bg-border object-cover object-top sm:w-48"
          />
        )}
        <div className="p-6 sm:p-8">
          <h3 className="mb-1 font-display text-2xl font-semibold transition group-hover:text-accent">
            {person.name}
          </h3>
          {person.headline && <p className="font-medium text-muted">{t(person.headline)}</p>}
          {(person.bioShort ?? person.bio) && (
            <p className="mt-4 leading-relaxed text-muted">
              {t(person.bioShort ?? person.bio)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PersonProfileCard({ member }: { member: PublishedGroupMember }) {
  const { person, roleTitle, roleLines } = member;
  const displayRoles = roleLines.length > 0 ? roleLines : [roleTitle];

  return (
    <article
      id={person.id}
      className="rounded-2xl border border-border bg-surface p-6 sm:p-8 scroll-mt-24"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-border sm:h-40 sm:w-40">
          {person.photo && (
            <img
              src={person.photo}
              alt={person.name}
              className="h-full w-full object-cover object-top"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
        <div>
          <h3 className="mb-1 font-display text-2xl font-semibold">{person.name}</h3>
          <div className="font-medium">
            {displayRoles.map((role) => (
              <p key={role}>{t(role)}</p>
            ))}
          </div>
          {person.subtitleLines.length > 0 && displayRoles.length === 1 && (
            <p className="mt-1 text-sm text-muted">
              {person.subtitleLines.map((line, idx) => (
                <span key={idx}>
                  {idx > 0 && <br />}
                  {t(line)}
                </span>
              ))}
            </p>
          )}
          {person.email && (
            <p className="mt-1 text-sm">
              <a href={`mailto:${person.email}`} className="text-muted hover:text-accent">
                {person.email}
              </a>
            </p>
          )}
          {person.bio && <p className="mt-4 leading-relaxed text-muted">{t(person.bio)}</p>}
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
  );
}
