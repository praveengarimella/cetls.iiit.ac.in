import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/research/")({
  head: () => pageMetadata("research"),
  component: () => <WikiPageView pageSlug="research" />,
});
