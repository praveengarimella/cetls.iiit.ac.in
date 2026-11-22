import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/people")({
  head: () => pageMetadata("people"),
  component: () => <WikiPageView pageSlug="people" />,
});
