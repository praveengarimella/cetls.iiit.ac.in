import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/research/k12")({
  head: () => pageMetadata("research-k12"),
  component: () => <PillarPage domainId="k12" />,
});
