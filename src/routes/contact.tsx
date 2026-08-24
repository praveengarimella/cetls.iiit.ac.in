import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact | CETLS" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Contact</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Reach the centre for research collaborations, student opportunities,
          partnerships, and the Learning Middleware.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <p className="font-medium">Centre for Education Technology and Learning Sciences</p>
          <p className="mt-2 leading-relaxed text-muted">
            International Institute of Information Technology
            <br />
            Gachibowli, Hyderabad 500032
            <br />
            Telangana, India
          </p>
          <div className="mt-5 space-y-2 text-sm leading-relaxed text-muted">
            <p>
              <span className="font-medium text-fg">Prof. Vasudeva Varma</span>
              <span> · Head of CETLS · vv@iiit.ac.in</span>
            </p>
            <p>
              <span className="font-medium text-fg">Praveen Garimella</span>
              <span> · Associate Professor of Practice · praveeng@iiit.ac.in</span>
            </p>
          </div>
          <p className="mt-4 text-sm text-muted">
            Website: cetls.iiit.ac.in (forthcoming on IIIT infrastructure)
          </p>
        </div>

        {sent ? (
          <div className="mt-10 rounded-xl border border-border bg-soft p-6">
            <p className="font-medium">Thank you</p>
            <p className="mt-2 leading-relaxed text-muted">
              Your message has been noted. We will follow up as the centre’s correspondence
              channels open. For urgent matters, please write via IIIT Hyderabad.
            </p>
          </div>
        ) : (
          <form className="mt-10 space-y-5" onSubmit={onSubmit}>
            <label className="block">
              <span className="text-sm font-medium">Name</span>
              <input
                required
                name="name"
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                required
                type="email"
                name="email"
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">How can we help?</span>
              <textarea
                required
                name="message"
                rows={5}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg hover:bg-primary-hover"
            >
              Send message
            </button>
          </form>
        )}
      </main>
    </SiteShell>
  );
}
