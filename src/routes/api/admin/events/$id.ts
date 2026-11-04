import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  assertCsrfOrigin,
  requireEventActor,
  softDeleteOrPurgeEvent,
  updateEventRecord,
} from "@/lib/events/repository.server";
import type { EventMutationInput } from "@/lib/events/schema";

export const Route = createFileRoute("/api/admin/events/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("editor", { request });
          const body = (await request.json()) as Partial<EventMutationInput>;
          const updated = await updateEventRecord(actor, params.id, body);
          return jsonResponse(updated);
        } catch (err) {
          return errorResponse(err);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("admin", { request });
          const url = new URL(request.url);
          const purge = url.searchParams.get("purge") === "true";
          const result = await softDeleteOrPurgeEvent(actor, params.id, purge);
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
