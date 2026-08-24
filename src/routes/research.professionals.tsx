import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pillars } from "@/lib/content";

const pillar = pillars[2];

export const Route = createFileRoute("/research/professionals")({
  head: () => ({ meta: [{ title: "Flexible Learning | CETLS" }] }),
  component: () => <PillarPage pillar={pillar} />,
});
