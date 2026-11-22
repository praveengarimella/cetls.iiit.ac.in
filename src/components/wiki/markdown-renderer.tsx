import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdvisoryList } from "@/components/advisory-list";
import { UpcomingEventsWidget } from "@/components/events/upcoming-events-widget";
import { ChiefMentorHomeCard } from "@/components/person-card";
import { ProgrammesSection } from "@/components/programmes-section";
import type { CetlsEvent } from "@/lib/events/types";
import {
  data,
  formatOrder,
  getDomains,
  getGroup,
  getPage,
  getPerson,
  publishedMembers,
  t,
} from "@/lib/site-data";
import { cn } from "@/lib/utils";

export interface ParsedFrontmatter {
  eyebrow?: string;
  subtitle?: string;
  lead?: string;
  backLabel?: string;
  backLink?: string;
  layout?: "article" | "wide" | "wide-article" | "directory" | "home";
}

export function parseMarkdownDocument(raw: string): {
  meta: ParsedFrontmatter;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { meta: {}, body: normalized };
  }
  const endIdx = normalized.indexOf("\n---\n", 4);
  if (endIdx === -1) {
    return { meta: {}, body: normalized };
  }
  const fmText = normalized.slice(4, endIdx);
  const body = normalized.slice(endIdx + 5).replace(/^\n+/, "");
  const meta: ParsedFrontmatter = {};
  for (const line of fmText.split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const val = line.slice(sep + 1).trim();
    if (!val) continue;
    if (key === "eyebrow") meta.eyebrow = val;
    else if (key === "subtitle") meta.subtitle = val;
    else if (key === "lead") meta.lead = val;
    else if (key === "backLabel") meta.backLabel = val;
    else if (key === "backLink") meta.backLink = val;
    else if (
      key === "layout" &&
      (val === "article" ||
        val === "wide" ||
        val === "wide-article" ||
        val === "directory" ||
        val === "home")
    ) {
      meta.layout = val;
    }
  }
  return { meta, body };
}

function isSafeHref(href: string): boolean {
  const trimmed = href.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return false;
  }
  return true;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Match embeds, images, links (with optional {.btn-*}), bold, italic, inline code
  const pattern =
    /(\{\{advisory-inline\}\})|(!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\))|(\[([^\]]+)\]\(([^)]+)\)(?:\{\.(btn-primary|btn-secondary|btn-light)\})?)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      nodes.push(<AdvisoryList key={`adv-${keyIdx++}`} variant="inline" />);
    } else if (match[2]) {
      const alt = match[3] ?? "";
      const src = match[4] ?? "";
      const caption = match[5];
      if (isSafeHref(src)) {
        nodes.push(
          <figure
            key={`img-${keyIdx++}`}
            className="my-6 overflow-hidden rounded-xl border border-border bg-surface"
          >
            <img
              src={src}
              alt={alt}
              className="aspect-16/10 w-full object-cover"
              loading="lazy"
            />
            {caption && (
              <figcaption className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted">
                {caption}
              </figcaption>
            )}
          </figure>,
        );
      }
    } else if (match[6]) {
      const label = match[7] ?? "";
      const rawHref = (match[8] ?? "").trim();
      const btnVariant = match[9] as
        | "btn-primary"
        | "btn-secondary"
        | "btn-light"
        | undefined;

      if (isSafeHref(rawHref)) {
        const btnClass =
          btnVariant === "btn-primary"
            ? "my-1 mr-2 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
            : btnVariant === "btn-secondary"
              ? "my-1 mr-2 inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
              : btnVariant === "btn-light"
                ? "mt-4 inline-flex min-h-11 items-center rounded-lg bg-surface px-6 py-3 text-sm font-medium text-primary transition-opacity hover:opacity-95"
                : "font-medium text-primary hover:text-accent hover:underline";

        const isExternal = /^https?:\/\//i.test(rawHref) || rawHref.startsWith("mailto:");
        if (isExternal) {
          nodes.push(
            <a
              key={`lnk-${keyIdx++}`}
              href={rawHref}
              target={rawHref.startsWith("mailto:") ? undefined : "_blank"}
              rel={rawHref.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              className={btnClass}
            >
              {label.replace(/\s*↗$/, "")}
              {!btnVariant && !rawHref.startsWith("mailto:") && (
                <ExternalLink className="ml-1 inline size-3.5" />
              )}
            </a>,
          );
        } else {
          const [toPath, hash] = rawHref.split("#");
          nodes.push(
            <Link
              key={`lnk-${keyIdx++}`}
              to={toPath || "/"}
              hash={hash || undefined}
              className={btnClass}
            >
              {label}
            </Link>,
          );
        }
      } else {
        nodes.push(label);
      }
    } else if (match[10]) {
      nodes.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-fg">
          {renderInline(match[11] ?? "")}
        </strong>,
      );
    } else if (match[12]) {
      nodes.push(<em key={`i-${keyIdx++}`}>{renderInline(match[13] ?? "")}</em>);
    } else if (match[14]) {
      nodes.push(
        <code
          key={`c-${keyIdx++}`}
          className="rounded bg-soft px-1.5 py-0.5 font-mono text-[0.9em] text-fg"
        >
          {match[15]}
        </code>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function badgeToneClass(badge: string): string {
  const lower = badge.toLowerCase();
  if (lower === "completed" || lower === "done") {
    return "border-primary/20 bg-primary/10 text-primary";
  }
  if (lower === "in progress" || lower === "active") {
    return "border-accent/30 bg-accent/10 text-accent";
  }
  return "border-border bg-soft text-muted";
}

function ContactDirectoryEmbed() {
  const addressLines = [
    data.org.address.street,
    `${data.org.address.locality}, ${data.org.address.city} ${data.org.address.postalCode}`,
    `${data.org.address.region}, ${data.org.address.country}`,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="my-8 rounded-xl border border-border bg-surface p-6">
      <p className="font-medium text-fg">{t(data.org.name.value)}</p>
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
          const displayName =
            c.showHonorific &&
            person.honorific &&
            !person.name.startsWith(person.honorific)
              ? `${person.honorific} ${person.name}`
              : person.name;
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
    </div>
  );
}

function ContactFormEmbed() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");
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
        headers: { Accept: "application/json" },
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

  if (status === "success") {
    return (
      <div className="my-8 rounded-xl border border-border bg-soft p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
            ✓
          </span>
          <p className="font-display text-xl font-semibold">
            {t(formConfig.successHeading)}
          </p>
        </div>
        <p className="mt-3 leading-relaxed text-muted">{t(formConfig.successBody)}</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-5 py-2 text-sm font-medium hover:bg-soft"
        >
          {t(formConfig.resetLabel)}
        </button>
      </div>
    );
  }

  return (
    <form className="my-8 space-y-5" onSubmit={onSubmit}>
      {status === "error" && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-accent">
          {errorMsg}
        </div>
      )}
      {formConfig.fields.map((field) => (
        <label key={field.name} className="block">
          <span className="text-sm font-medium text-fg">{t(field.label)}</span>
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
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "submitting"
          ? t(formConfig.submittingLabel)
          : t(formConfig.submitLabel)}
      </button>
    </form>
  );
}

function renderEmbed(token: string, events?: CetlsEvent[]): ReactNode {
  switch (token) {
    case "upcoming-events":
      return (
        <div className="my-10 -mx-5 sm:-mx-6">
          <UpcomingEventsWidget events={events ?? []} />
        </div>
      );
    case "domains-grid": {
      const domains = getDomains();
      return (
        <div className="my-8 grid gap-5 sm:grid-cols-2">
          {domains.map((d) => (
            <Link
              key={d.id}
              to={d.path}
              className="group rounded-xl border border-border bg-surface p-7 transition-shadow hover:border-primary hover:shadow-sm"
            >
              <p className="text-sm font-medium text-accent">{formatOrder(d.order)}</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-fg group-hover:text-accent">
                {t(d.title)}
              </h3>
              <p className="mt-3 leading-relaxed text-muted">{t(d.summary)}</p>
            </Link>
          ))}
        </div>
      );
    }
    case "chief-mentor": {
      const group = getGroup("chief-mentor");
      const members = publishedMembers("chief-mentor");
      const peoplePath = getPage("people").path;
      if (members.length === 0) return null;
      return (
        <section className="my-14">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {group.homeEyebrow && (
                <p className="mb-1.5 text-sm font-medium tracking-wide text-accent uppercase">
                  {t(group.homeEyebrow)}
                </p>
              )}
              <h2 className="font-display text-3xl font-semibold">{t(group.name)}</h2>
            </div>
            {group.homeCtaLabel && (
              <Link to={peoplePath} className="font-medium text-accent hover:underline">
                {t(group.homeCtaLabel)}
              </Link>
            )}
          </div>
          <div className="space-y-6">
            {members.map((m) => (
              <ChiefMentorHomeCard key={m.person.id} member={m} />
            ))}
          </div>
        </section>
      );
    }
    case "advisory-strip": {
      const group = getGroup("advisory");
      const members = publishedMembers("advisory");
      const advisoryPath = getPage("advisory").path;
      if (members.length === 0) return null;
      return (
        <section className="my-14">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-3xl font-semibold">{t(group.name)}</h2>
            {group.homeCtaLabel && (
              <Link to={advisoryPath} className="font-medium text-accent hover:underline">
                {t(group.homeCtaLabel)}
              </Link>
            )}
          </div>
          <AdvisoryList variant="strip" />
        </section>
      );
    }
    case "programmes":
      return (
        <div className="my-10">
          <ProgrammesSection variant="about" />
        </div>
      );
    case "contact-directory":
      return <ContactDirectoryEmbed />;
    case "contact-form":
      return <ContactFormEmbed />;
    default:
      return null;
  }
}

function renderBlocks(
  lines: string[],
  events?: CetlsEvent[],
  meta?: ParsedFrontmatter,
): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let renderedFirstH1 = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Standalone {{embed}}
    const embedMatch = /^\{\{([a-z0-9-]+)\}\}$/.exec(trimmed);
    if (embedMatch && embedMatch[1] !== "advisory-inline") {
      out.push(<div key={`emb-${key++}`}>{renderEmbed(embedMatch[1], events)}</div>);
      i += 1;
      continue;
    }

    // Fenced custom blocks: :::card Title | Badge, :::hero-banner Title | Eyebrow, :::callout
    if (trimmed.startsWith(":::")) {
      const spec = trimmed.slice(3).trim();
      const [kindPart, ...restSpec] = spec.split(/\s+/);
      const headerRaw = restSpec.join(" ").trim();
      const [headerTitle, headerBadge] = headerRaw.split("|").map((s) => s.trim());

      const innerLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        innerLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim() === ":::") i += 1;

      if (kindPart === "person") {
        let personId: string | undefined;
        let photo: string | undefined;
        let email: string | undefined;
        const roles: string[] = [];
        const subtitles: string[] = [];
        let bodyStart = 0;

        while (bodyStart < innerLines.length) {
          const rawLine = innerLines[bodyStart].trim();
          if (!rawLine) {
            bodyStart += 1;
            break;
          }
          const metaMatch = /^(id|photo|role|subtitle|email):\s*(.+)$/i.exec(rawLine);
          if (!metaMatch) break;
          const mKey = metaMatch[1].toLowerCase();
          const mVal = metaMatch[2].trim();
          if (mKey === "id") personId = mVal;
          else if (mKey === "photo") photo = mVal;
          else if (mKey === "email") email = mVal;
          else if (mKey === "role") roles.push(mVal);
          else if (mKey === "subtitle") subtitles.push(mVal);
          bodyStart += 1;
        }

        const bioLines = innerLines.slice(bodyStart);

        out.push(
          <article
            key={`prs-${key++}`}
            id={personId}
            className="my-6 scroll-mt-24 rounded-2xl border border-border bg-surface p-6 sm:p-8"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-border sm:h-40 sm:w-40">
                {photo && isSafeHref(photo) && (
                  <img
                    src={photo}
                    alt={headerTitle || "Profile photo"}
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {headerTitle && (
                  <h3 className="mb-1 font-display text-2xl font-semibold text-fg">
                    {headerTitle}
                  </h3>
                )}
                {roles.length > 0 && (
                  <div className="font-medium text-fg">
                    {roles.map((r, ri) => (
                      <p key={ri}>{renderInline(r)}</p>
                    ))}
                  </div>
                )}
                {subtitles.length > 0 && (
                  <p className="mt-1 text-sm text-muted">
                    {subtitles.map((sub, si) => (
                      <span key={si}>
                        {si > 0 && <br />}
                        {renderInline(sub)}
                      </span>
                    ))}
                  </p>
                )}
                {email && (
                  <p className="mt-1 text-sm">
                    <a
                      href={`mailto:${email}`}
                      className="text-muted hover:text-accent hover:underline"
                    >
                      {email}
                    </a>
                  </p>
                )}
                {bioLines.length > 0 && (
                  <div className="mt-3 space-y-2.5 leading-relaxed text-muted [&_a]:text-sm [&_a]:text-accent">
                    {renderBlocks(bioLines, events)}
                  </div>
                )}
              </div>
            </div>
          </article>,
        );
      } else if (kindPart === "hero-banner") {
        out.push(
          <div
            key={`ban-${key++}`}
            className="my-12 rounded-2xl bg-primary px-8 py-12 text-primary-fg sm:px-12 sm:py-14"
          >
            <div className="max-w-2xl">
              {headerBadge && (
                <p className="text-sm font-medium tracking-wide uppercase opacity-80">
                  {headerBadge}
                </p>
              )}
              {headerTitle && (
                <h2 className="mt-2 font-display text-3xl font-semibold">
                  {headerTitle}
                </h2>
              )}
              <div className="mt-4 space-y-3 text-lg leading-relaxed opacity-95 [&_p]:text-primary-fg/90">
                {renderBlocks(innerLines, events)}
              </div>
            </div>
          </div>,
        );
      } else if (kindPart === "callout") {
        out.push(
          <div
            key={`cal-${key++}`}
            className="my-10 rounded-2xl border border-border bg-soft p-6 sm:p-8"
          >
            {renderBlocks(innerLines, events)}
          </div>,
        );
      } else {
        // Default: card
        out.push(
          <div
            key={`crd-${key++}`}
            className="my-5 rounded-xl border border-border bg-surface p-6"
          >
            {(headerTitle || headerBadge) && (
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                {headerTitle && (
                  <h3 className="font-display text-lg font-semibold text-fg">
                    {headerTitle}
                  </h3>
                )}
                {headerBadge && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      badgeToneClass(headerBadge),
                    )}
                  >
                    {headerBadge}
                  </span>
                )}
              </div>
            )}
            <div className="space-y-2.5 text-sm leading-relaxed text-muted">
              {renderBlocks(innerLines, events)}
            </div>
          </div>,
        );
      }
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      out.push(<hr key={`hr-${key++}`} className="my-10 border-border" />);
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      if (level === 1 && !renderedFirstH1) {
        renderedFirstH1 = true;
        out.push(
          <header key={`h1-${key++}`} className="mb-8">
            {meta?.backLink && meta?.backLabel && (
              <Link
                to={meta.backLink}
                className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="size-4" />
                {meta.backLabel}
              </Link>
            )}
            {meta?.eyebrow && (
              <p className="mb-3 text-sm font-medium tracking-wide text-accent uppercase">
                {meta.eyebrow}
              </p>
            )}
            <h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              {renderInline(text)}
            </h1>
            {meta?.subtitle && (
              <p className="mt-3 text-sm font-medium text-muted">{meta.subtitle}</p>
            )}
            {meta?.lead && (
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted sm:text-xl">
                {renderInline(meta.lead)}
              </p>
            )}
          </header>,
        );
      } else if (level === 1) {
        out.push(
          <h1
            key={`h1-${key++}`}
            className="mt-10 font-display text-3xl font-semibold tracking-tight text-fg"
          >
            {renderInline(text)}
          </h1>,
        );
      } else if (level === 2) {
        out.push(
          <h2
            key={`h2-${key++}`}
            className="mt-12 font-display text-2xl font-semibold tracking-tight text-fg"
          >
            {renderInline(text)}
          </h2>,
        );
      } else if (level === 3) {
        out.push(
          <h3
            key={`h3-${key++}`}
            className="mt-6 font-display text-xl font-semibold text-fg"
          >
            {renderInline(text)}
          </h3>,
        );
      } else {
        out.push(
          <h4 key={`h4-${key++}`} className="mt-4 font-semibold text-fg">
            {renderInline(text)}
          </h4>,
        );
      }
      i += 1;
      continue;
    }

    // GFM Table
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1])
    ) {
      const parseCells = (row: string) =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const headers = parseCells(lines[i]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        rows.push(parseCells(lines[i]));
        i += 1;
      }
      out.push(
        <div
          key={`tbl-${key++}`}
          className="my-6 overflow-x-auto rounded-xl border border-border"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border bg-soft">
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="px-4 py-2.5 font-semibold text-fg">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-muted">
                      {renderInline(r[ci] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(
        <blockquote
          key={`bq-${key++}`}
          className="my-6 rounded-r-xl border-l-4 border-primary bg-soft/60 py-3 pr-5 pl-5 italic text-muted"
        >
          {renderInline(quoteLines.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      out.push(
        <ul
          key={`ul-${key++}`}
          className="my-4 list-disc space-y-2.5 pl-6 leading-relaxed text-muted"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      out.push(
        <ol key={`ol-${key++}`} className="my-4 space-y-3">
          {items.map((it, idx) => (
            <li
              key={idx}
              className="flex gap-3.5 rounded-xl border border-border bg-bg p-4 text-sm leading-relaxed text-muted sm:text-base"
            >
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-semibold text-primary">
                {idx + 1}
              </span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph (join consecutive plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(":::") &&
      !lines[i].trim().startsWith(">") &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim()) &&
      !/^\{\{[a-z0-9-]+\}\}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    if (paraLines.length > 0) {
      out.push(
        <p key={`p-${key++}`} className="my-4 leading-relaxed text-muted">
          {renderInline(paraLines.join(" "))}
        </p>,
      );
    } else {
      i += 1;
    }
  }

  return out;
}

export function WikiMarkdownRenderer({
  markdown,
  events,
  className,
}: {
  markdown: string;
  events?: CetlsEvent[];
  className?: string;
}) {
  const { meta, body } = parseMarkdownDocument(markdown);
  const lines = body.split("\n");
  const maxWidthClass =
    meta.layout === "home" || meta.layout === "wide"
      ? "max-w-6xl"
      : meta.layout === "directory"
        ? "max-w-5xl"
        : meta.layout === "wide-article"
          ? "max-w-4xl"
          : "max-w-3xl";

  return (
    <div className={cn("mx-auto px-5 py-12 sm:px-6 sm:py-16", maxWidthClass, className)}>
      {renderBlocks(lines, events, meta)}
    </div>
  );
}
