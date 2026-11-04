import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "@/lib/events/http.server";
import { buildIcsFeed } from "@/lib/events/ics";
import { queryPublicEvents } from "@/lib/events/repository.server";

export const Route = createFileRoute("/events.ics")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { events } = await queryPublicEvents();
          const ics = buildIcsFeed(events);
          return new Response(ics, {
            status: 200,
            headers: {
              "Content-Type": "text/calendar; charset=utf-8",
              "Content-Disposition": 'inline; filename="cetls-events.ics"',
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
