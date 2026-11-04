import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  assertCsrfOrigin,
  cancelEventWithReason,
  requireEventActor,
} from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/admin/events/$id/cancel")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("admin", { request });
          const body = (await request.json()) as { reason?: string; cancelReason?: string };
          const reason = body.reason ?? body.cancelReason ?? "";
          const updated = await cancelEventWithReason(actor, params.id, reason);
          return jsonResponse(updated);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
