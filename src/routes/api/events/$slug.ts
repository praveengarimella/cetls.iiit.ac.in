import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import { buildIcsFeed } from "@/lib/events/ics";
import { getPublicEventBySlug } from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/events/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const rawParam = params.slug ?? "";
          const wantsIcs = rawParam.toLowerCase().endsWith(".ics");
          const cleanSlug = rawParam.replace(/\.ics$/i, "");
          const event = await getPublicEventBySlug(cleanSlug);
          if (!event) {
            return jsonResponse({ error: "Event not found." }, 404);
          }
          if (wantsIcs) {
            const ics = buildIcsFeed([event], event.title);
            return new Response(ics, {
              status: 200,
              headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
              },
            });
          }
          return jsonResponse(event, 200, {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
