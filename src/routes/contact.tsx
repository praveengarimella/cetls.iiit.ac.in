import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact | CETLS" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("https://formspree.io/f/xyeydqww", {
        method: "POST",
        body: data,
        headers: {
          Accept: "application/json",
        },
      });

      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(
          json?.errors?.map((err: { message: string }) => err.message).join(", ") ||
            "Failed to send message. Please try again or email us directly."
        );
        setStatus("error");
      }
    } catch {
      setErrorMsg("A network error occurred. Please check your connection or email us directly.");
      setStatus("error");
    }
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
          <p className="font-medium">Centre for Educational Technology and Learning Sciences</p>
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

        {status === "success" ? (
          <div className="mt-10 rounded-xl border border-border bg-soft p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-bold">
                ✓
              </span>
              <p className="font-display text-xl font-semibold">Thank you!</p>
            </div>
            <p className="mt-3 leading-relaxed text-muted">
              Your message has been sent successfully. We will follow up with you shortly.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-6 inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-5 py-2 text-sm font-medium hover:bg-soft"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form className="mt-10 space-y-5" onSubmit={onSubmit}>
            {status === "error" && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                {errorMsg}
              </div>
            )}
            <label className="block">
              <span className="text-sm font-medium">Name</span>
              <input
                required
                name="name"
                disabled={status === "submitting"}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                required
                type="email"
                name="email"
                disabled={status === "submitting"}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">How can we help?</span>
              <textarea
                required
                name="message"
                rows={5}
                disabled={status === "submitting"}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </main>
    </SiteShell>
  );
}
