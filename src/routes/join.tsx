import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/join")({
  head: () => pageMetadata("join"),
  component: () => <WikiPageView pageSlug="join" />,
});
