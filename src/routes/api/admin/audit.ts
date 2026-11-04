import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  queryAuditLogs,
  requireEventActor,
} from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/admin/audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actor = await requireEventActor("admin", { request });
          const url = new URL(request.url);
          const eventId = url.searchParams.get("eventId") ?? undefined;
          const logs = await queryAuditLogs(actor, eventId);
          return jsonResponse({ logs });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
