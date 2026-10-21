import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/research/higher-education")({
  head: () => pageMetadata("research-higher-education"),
  component: () => <PillarPage domainId="higher-education" />,
});
