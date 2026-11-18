import { createFileRoute } from "@tanstack/react-router";
import { getPublishedSiteData } from "@/lib/cms/repository.server";

export const Route = createFileRoute("/api/site-data")({
  server: {
    handlers: {
      GET: async () => {
        const published = await getPublishedSiteData();
        return Response.json(published, {
          headers: {
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
