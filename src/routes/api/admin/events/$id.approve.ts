import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  approveAndPublishEvent,
  assertCsrfOrigin,
  requireEventActor,
} from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/admin/events/$id/approve")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("admin", { request });
          let mode: "published" | "pending" | undefined;
          try {
            const body = (await request.json()) as { mode?: "published" | "pending" };
            if (body?.mode === "published" || body?.mode === "pending") {
              mode = body.mode;
            }
          } catch {
            // Optional JSON body
          }
          const updated = await approveAndPublishEvent(actor, params.id, mode);
          return jsonResponse(updated);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
