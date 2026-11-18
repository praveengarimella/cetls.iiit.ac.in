import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/inaugural")({
  head: () => pageMetadata("inaugural"),
  component: () => <WikiPageView pageSlug="inaugural" />,
});
