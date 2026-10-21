import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdvisoryList } from "@/components/advisory-list";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/seo";
import { data, getGroup, getPage, t } from "@/lib/site-data";

export const Route = createFileRoute("/advisory")({
  head: () => pageMetadata("advisory"),
  component: AdvisoryPage,
});

const LEGACY_ANCHOR_MAP = new Map<string, string>(
  data.people
    .filter((p): p is typeof p & { legacyAnchor: string } => Boolean(p.legacyAnchor))
    .map((p) => [p.legacyAnchor, p.id]),
);

function AdvisoryPage() {
  const advisoryGroup = getGroup("advisory");
  const peoplePage = getPage("people");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawHash = window.location.hash.replace(/^#/, "");
    const mappedId = LEGACY_ANCHOR_MAP.get(rawHash);
    if (mappedId) {
      window.history.replaceState(null, "", `#${mappedId}`);
      const el = document.getElementById(mappedId);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-16">
        <p className="mb-3 text-sm font-medium tracking-wide text-accent uppercase">
          {t(peoplePage.title)}
        </p>
        <h1 className="mb-6 font-display text-4xl font-semibold tracking-tight">
          {t(advisoryGroup.name)}
        </h1>
        {advisoryGroup.description && (
          <p className="mb-16 max-w-3xl text-xl leading-relaxed text-muted">
            {t(advisoryGroup.description)}
          </p>
        )}

        <AdvisoryList variant="full" withAnchors headingLevel="h2" />
      </main>
    </SiteShell>
  );
}
