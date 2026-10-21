import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/research/third-age")({
  head: () => pageMetadata("research-third-age"),
  component: () => <PillarPage domainId="third-age" />,
});
