import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/research/professionals")({
  head: () => pageMetadata("research-professionals"),
  component: () => <PillarPage domainId="professionals" />,
});
