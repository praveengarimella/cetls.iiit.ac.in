import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pillars } from "@/lib/content";

const pillar = pillars[1];

export const Route = createFileRoute("/research/higher-education")({
  head: () => ({ meta: [{ title: "Higher Education | CETLS" }] }),
  component: () => <PillarPage pillar={pillar} />,
});
