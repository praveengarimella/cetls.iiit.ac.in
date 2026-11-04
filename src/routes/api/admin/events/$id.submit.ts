import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  assertCsrfOrigin,
  requireEventActor,
  submitEventForApproval,
} from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/admin/events/$id/submit")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("editor", { request });
          const updated = await submitEventForApproval(actor, params.id);
          return jsonResponse(updated);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
