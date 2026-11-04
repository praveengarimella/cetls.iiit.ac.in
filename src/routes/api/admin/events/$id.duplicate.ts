import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  assertCsrfOrigin,
  duplicateEventAsDraft,
  requireEventActor,
} from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/admin/events/$id/duplicate")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("editor", { request });
          const created = await duplicateEventAsDraft(actor, params.id);
          return jsonResponse(created, 201);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
