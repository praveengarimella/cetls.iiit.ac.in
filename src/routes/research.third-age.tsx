import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pillars } from "@/lib/content";

const pillar = pillars[3];

export const Route = createFileRoute("/research/third-age")({
  head: () => ({ meta: [{ title: "Third-Age Learning | CETLS" }] }),
  component: () => <PillarPage pillar={pillar} />,
});
