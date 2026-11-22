import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { pageMetadata } from "@/lib/seo";
import { data } from "@/lib/site-data";

export const Route = createFileRoute("/advisory")({
  head: () => pageMetadata("advisory"),
  component: AdvisoryPage,
});

const LEGACY_ANCHOR_MAP = new Map<string, string>(
  data.people
    .filter((p): p is typeof p & { legacyAnchor: string } =>
      Boolean(p.legacyAnchor),
    )
    .map((p) => [p.legacyAnchor, p.id]),
);

function AdvisoryPage() {
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

  return <WikiPageView pageSlug="advisory" />;
}
