import { createFileRoute } from "@tanstack/react-router";
import { PillarPage } from "@/components/pillar-page";
import { pillars } from "@/lib/content";

const pillar = pillars[0];

export const Route = createFileRoute("/research/k12")({
  head: () => ({ meta: [{ title: "K-12 Education | CETLS" }] }),
  component: () => <PillarPage pillar={pillar} />,
});
