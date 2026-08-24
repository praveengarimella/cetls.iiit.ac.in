import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/people")({
  head: () => ({ meta: [{ title: "People | CETLS" }] }),
  component: PeoplePage,
});

const leadership = [
  {
    name: "Prof. Vasudeva Varma",
    roles: ["Professor at IIIT Hyderabad", "Head of CETLS"],
    email: "vv@iiit.ac.in",
    photo: "/people/vasudeva-varma.jpg",
  },
  {
    name: "Praveen Garimella",
    roles: ["Associate Professor of Practice"],
    email: "praveeng@iiit.ac.in",
    photo: "/people/praveen-garimella.jpg",
  },
];

function PeoplePage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">People</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          CETLS is an interdisciplinary research centre at IIIT Hyderabad. The team and
          affiliate network will grow as the centre takes shape.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Leadership</h2>
          <div className="mt-6 space-y-5">
            {leadership.map((p) => (
              <div
                key={p.name}
                className="flex overflow-hidden rounded-xl border border-border bg-surface"
              >
                <img
                  src={p.photo}
                  alt={p.name}
                  className="w-28 shrink-0 self-stretch object-cover object-top sm:w-36"
                />
                <div className="min-w-0 px-5 py-5 sm:px-6 sm:py-6">
                  <p className="font-display text-xl font-semibold">{p.name}</p>
                  <div className="mt-1 text-sm text-accent">
                    {p.roles.map((role) => (
                      <p key={role}>{role}</p>
                    ))}
                  </div>
                  <a
                    href={`mailto:${p.email}`}
                    className="mt-3 inline-block text-sm text-muted hover:text-accent"
                  >
                    {p.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Faculty, researchers & students</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Profiles of additional faculty, research staff, postdoctoral scholars, and
            students will appear here as the team grows. CETLS welcomes affiliates from
            across IIIT Hyderabad and partner institutions.
          </p>
        </section>

        <div className="mt-12 rounded-xl border border-border bg-soft p-6">
          <p className="font-medium">Join the team</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            We are building a cohort of researchers, students, and collaborators.
          </p>
          <Link to="/join" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            See opportunities →
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
