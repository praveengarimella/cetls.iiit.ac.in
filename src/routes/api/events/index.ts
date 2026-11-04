import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import { queryPublicEvents } from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/events/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const result = await queryPublicEvents({
            from: url.searchParams.get("from") ?? undefined,
            to: url.searchParams.get("to") ?? undefined,
            category: url.searchParams.get("category") ?? undefined,
            domain: url.searchParams.get("domain") ?? undefined,
            city: url.searchParams.get("city") ?? undefined,
            mode: url.searchParams.get("mode") ?? undefined,
            series: url.searchParams.get("series") ?? undefined,
          });
          return jsonResponse(result, 200, {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
