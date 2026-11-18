import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { getPublicEventsFn } from "@/lib/events/events-api";
import { getSeedEvents } from "@/lib/events/seed-data";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => pageMetadata("home"),
  loader: async () => {
    try {
      const res = await getPublicEventsFn({ data: {} });
      return { events: res.events };
    } catch {
      return { events: getSeedEvents() };
    }
  },
  component: Home,
});

function Home() {
  const { events } = Route.useLoaderData();
  return <WikiPageView pageSlug="home" events={events} />;
}
