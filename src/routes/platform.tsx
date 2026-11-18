import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/platform")({
  head: () => pageMetadata("platform"),
  component: () => <WikiPageView pageSlug="platform" />,
});
