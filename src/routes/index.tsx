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
              Learning sciences and technology across the lifespan
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              Advancing rigorous research and design for better learning from K-12 through
              higher education, professional life, and the third age — grounded in the realities
              of India and the Global South while contributing to the global research community.
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
              We organise our work around four interconnected domains, each addressing the
              fundamental questions of what to learn, how to teach and facilitate, how people
              learn, and how progress is understood.
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
                An open technology layer designed to make the tools of learning sciences available to
                educators, researchers, and institutions across the entire spectrum of learners.
                By releasing it as open source, we aim to lower barriers and accelerate
                evidence-based innovation for K-12, higher education, professional learning,
                and third-age contexts.
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

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium tracking-wide text-accent uppercase">People</p>
              <h2 className="font-display text-3xl font-semibold">Chief Mentor</h2>
            </div>
            <Link to="/people" className="whitespace-nowrap font-medium text-accent hover:underline">
              Meet the leadership team →
            </Link>
          </div>
          <Link to="/people" className="group block bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary transition">
            <div className="flex flex-col sm:flex-row">
              <img src="/people/raj-reddy.jpg" alt="Prof. Raj Reddy" className="w-full sm:w-48 h-48 object-cover object-top shrink-0 bg-border" />
              <div className="p-6 sm:p-8">
                <h3 className="font-display text-2xl font-semibold mb-1 group-hover:text-accent transition">Prof. Raj Reddy</h3>
                <p className="font-medium text-muted">Moza Bint Nasser University Professor of Computer Science and Robotics, Carnegie Mellon University</p>
                <p className="mt-4 text-muted leading-relaxed">
                  Dabbala Rajagopal "Raj" Reddy is an Indian-American computer scientist and one of the early pioneers of artificial intelligence. He serves as the Chief Mentor for CETLS, guiding its research and vision at the intersection of AI and education. He and Edward Feigenbaum won the 1994 ACM Turing Award for their pioneering work in artificial intelligence.
                </p>
              </div>
            </div>
          </Link>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold">International Advisory Committee</h2>
            </div>
            <Link to="/advisory" className="whitespace-nowrap font-medium text-accent hover:underline">
              Meet the committee →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            <Link to="/advisory" hash="goel" className="group block">
              <img src="/people/ashok-goel.png" alt="Ashok K. Goel" className="mb-3 aspect-square w-full rounded-xl border border-border object-cover object-top" />
              <div className="font-semibold transition group-hover:text-accent">Ashok K. Goel</div>
              <div className="text-sm text-muted">Georgia Tech</div>
            </Link>
            <Link to="/advisory" hash="baker" className="group block">
              <img src="/people/ryan-baker.png" alt="Ryan S. Baker" className="mb-3 aspect-square w-full rounded-xl border border-border object-cover object-top" />
              <div className="font-semibold transition group-hover:text-accent">Ryan S. Baker</div>
              <div className="text-sm text-muted">Adelaide University</div>
            </Link>
            <Link to="/advisory" hash="kam" className="group block">
              <img src="/people/matthew-kam.png" alt="Matthew Kam" className="mb-3 aspect-square w-full rounded-xl border border-border object-cover object-top" />
              <div className="font-semibold transition group-hover:text-accent">Matthew Kam</div>
              <div className="text-sm text-muted">Google</div>
            </Link>
            <Link to="/advisory" hash="lomas" className="group block">
              <img src="/people/derek-lomas.png" alt="J. Derek Lomas" className="mb-3 aspect-square w-full rounded-xl border border-border object-cover object-top" />
              <div className="font-semibold transition group-hover:text-accent">J. Derek Lomas</div>
              <div className="text-sm text-muted">TU Delft</div>
            </Link>
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
