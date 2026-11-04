import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  assertCsrfOrigin,
  requireEventActor,
  restoreSoftDeletedEvent,
} from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/admin/events/$id/restore")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("admin", { request });
          const updated = await restoreSoftDeletedEvent(actor, params.id);
          return jsonResponse(updated);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
