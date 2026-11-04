import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  assertCsrfOrigin,
  createEventRecord,
  listAdminEvents,
  requireEventActor,
} from "@/lib/events/repository.server";
import type { EventMutationInput } from "@/lib/events/schema";

export const Route = createFileRoute("/api/admin/events/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const actor = await requireEventActor("editor", { request });
          const events = await listAdminEvents(actor);
          return jsonResponse({ events });
        } catch (err) {
          return errorResponse(err);
        }
      },
      POST: async ({ request }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("editor", { request });
          const body = (await request.json()) as EventMutationInput;
          const created = await createEventRecord(actor, body);
          return jsonResponse(created, 201);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
