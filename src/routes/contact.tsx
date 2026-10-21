import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { data, getPerson, t } from "@/lib/site-data";

export const Route = createFileRoute("/contact")({
  head: () => pageMetadata("contact"),
  component: ContactPage,
});

function formatContactName(personId: string, showHonorific: boolean): string {
  const person = getPerson(personId);
  if (
    showHonorific &&
    person.honorific &&
    !person.name.startsWith(person.honorific)
  ) {
    return `${person.honorific} ${person.name}`;
  }
  return person.name;
}

function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const formConfig = data.contact.form;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch(formConfig.endpoint, {
        method: "POST",
        body: formData,
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
            t(formConfig.errorFallback),
        );
        setStatus("error");
      }
    } catch {
      setErrorMsg(t(formConfig.networkError));
      setStatus("error");
    }
  }

  const addressLines = [
    data.org.address.street,
    `${data.org.address.locality}, ${data.org.address.city} ${data.org.address.postalCode}`,
    `${data.org.address.region}, ${data.org.address.country}`,
  ].filter((line): line is string => Boolean(line));

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {t(data.contact.heading)}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {t(data.contact.intro)}
        </p>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <p className="font-medium">{t(data.org.name.value)}</p>
          <p className="mt-2 leading-relaxed text-muted">
            {data.org.parent.url ? (
              <a
                href={data.org.parent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                {t(data.org.parent.displayName)}
              </a>
            ) : (
              t(data.org.parent.displayName)
            )}
            {addressLines.map((line, idx) => (
              <span key={idx}>
                <br />
                {t(line)}
              </span>
            ))}
          </p>

          {data.contact.email && (
            <p className="mt-4 text-sm">
              <span className="font-medium text-fg">Centre Email: </span>
              <a
                href={`mailto:${data.contact.email}`}
                className="text-primary hover:underline"
              >
                {data.contact.email}
              </a>
            </p>
          )}

          <div className="mt-5 space-y-2 text-sm leading-relaxed text-muted">
            {data.contact.contacts.map((c) => {
              const person = getPerson(c.personId);
              const displayName = formatContactName(c.personId, c.showHonorific);
              return (
                <p key={c.personId}>
                  <span className="font-medium text-fg">{displayName}</span>
                  <span> · {t(c.roleLabel)}</span>
                  {person.email && (
                    <span>
                      {" "}
                      ·{" "}
                      <a
                        href={`mailto:${person.email}`}
                        className="hover:text-accent hover:underline"
                      >
                        {person.email}
                      </a>
                    </span>
                  )}
                </p>
              );
            })}
          </div>

          {data.contact.websiteNote && (
            <p className="mt-4 text-sm text-muted">{t(data.contact.websiteNote)}</p>
          )}
        </div>

        {status === "success" ? (
          <div className="mt-10 rounded-xl border border-border bg-soft p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                ✓
              </span>
              <p className="font-display text-xl font-semibold">
                {t(formConfig.successHeading)}
              </p>
            </div>
            <p className="mt-3 leading-relaxed text-muted">
              {t(formConfig.successBody)}
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-6 inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-5 py-2 text-sm font-medium hover:bg-soft"
            >
              {t(formConfig.resetLabel)}
            </button>
          </div>
        ) : (
          <form className="mt-10 space-y-5" onSubmit={onSubmit}>
            {status === "error" && (
              <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-accent">
                {errorMsg}
                {data.contact.email && (
                  <>
                    {" "}
                    <a
                      href={`mailto:${data.contact.email}`}
                      className="font-medium underline"
                    >
                      {data.contact.email}
                    </a>
                  </>
                )}
              </div>
            )}
            {formConfig.fields.map((field) => (
              <label key={field.name} className="block">
                <span className="text-sm font-medium">{t(field.label)}</span>
                {field.type === "textarea" ? (
                  <textarea
                    required={field.required}
                    name={field.name}
                    rows={field.rows ?? 5}
                    disabled={status === "submitting"}
                    className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary disabled:opacity-60"
                  />
                ) : (
                  <input
                    required={field.required}
                    type={field.type}
                    name={field.name}
                    disabled={status === "submitting"}
                    className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none focus:border-primary disabled:opacity-60"
                  />
                )}
              </label>
            ))}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting"
                ? t(formConfig.submittingLabel)
                : t(formConfig.submitLabel)}
            </button>
          </form>
        )}
      </main>
    </SiteShell>
  );
}
