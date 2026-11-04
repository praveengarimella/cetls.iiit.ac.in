import { createMiddleware, createServerFn } from "@tanstack/react-start";
import type { EventMutationInput } from "./schema";
import type {
  CetlsEvent,
  EventAuditEntry,
  EventUserRecord,
  EventUserRole,
  EventsFilterParams,
  ExpandedEventOccurrence,
} from "./types";

const optionalBearerMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    return next({ context: { bearerToken: context.bearerToken } });
  });

export interface PublicEventsResponse {
  events: CetlsEvent[];
  occurrences: ExpandedEventOccurrence[];
  cities: string[];
  seriesTags: string[];
  timezone: string;
  source: "database" | "snapshot-fallback";
}

export const getPublicEventsFn = createServerFn({ method: "GET" })
  .validator((filters: EventsFilterParams | undefined) => filters ?? {})
  .handler(async ({ data: filters }): Promise<PublicEventsResponse> => {
    const { queryPublicEvents } = await import("./repository.server");
    return queryPublicEvents(filters);
  });

export const getPublicEventBySlugFn = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<CetlsEvent | null> => {
    const { getPublicEventBySlug } = await import("./repository.server");
    return getPublicEventBySlug(slug);
  });

export interface AdminDashboardState {
  signedIn: boolean;
  email: string | null;
  actor: {
    userId: string;
    email: string;
    name: string;
    role: EventUserRole;
  } | null;
  events: CetlsEvent[];
  users: EventUserRecord[];
  auditLogs: EventAuditEntry[];
}

export const getAdminDashboardFn = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .handler(async ({ context }): Promise<AdminDashboardState> => {
    const {
      getOptionalEventActor,
      listAdminEvents,
      listAllowlistUsers,
      queryAuditLogs,
    } = await import("./repository.server");
    const status = await getOptionalEventActor(context.bearerToken);
    if (!status.signedIn || !status.actor) {
      return {
        signedIn: status.signedIn,
        email: status.email,
        actor: null,
        events: [],
        users: [],
        auditLogs: [],
      };
    }

    const events = await listAdminEvents(status.actor);
    const users = await listAllowlistUsers(status.actor);
    const auditLogs =
      status.actor.role === "admin" ? await queryAuditLogs(status.actor) : [];

    return {
      signedIn: true,
      email: status.email,
      actor: status.actor,
      events,
      users,
      auditLogs,
    };
  });

export const adminCreateEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: EventMutationInput) => input)
  .handler(async ({ context, data: input }): Promise<CetlsEvent> => {
    const { assertCsrfOrigin, createEventRecord, requireEventActor } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    return createEventRecord(actor, input);
  });

export const adminUpdateEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { id: string; patch: Partial<EventMutationInput> }) => input)
  .handler(async ({ context, data: input }): Promise<CetlsEvent> => {
    const { assertCsrfOrigin, requireEventActor, updateEventRecord } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    return updateEventRecord(actor, input.id, input.patch);
  });

export const adminSubmitEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data: input }): Promise<CetlsEvent> => {
    const { assertCsrfOrigin, requireEventActor, submitEventForApproval } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    return submitEventForApproval(actor, input.id);
  });

export const adminApproveEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { id: string; mode?: "published" | "pending" }) => input)
  .handler(async ({ context, data: input }): Promise<CetlsEvent> => {
    const { approveAndPublishEvent, assertCsrfOrigin, requireEventActor } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    return approveAndPublishEvent(actor, input.id, input.mode);
  });

export const adminDuplicateEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data: input }): Promise<CetlsEvent> => {
    const { assertCsrfOrigin, duplicateEventAsDraft, requireEventActor } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    return duplicateEventAsDraft(actor, input.id);
  });

export const adminCancelEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { id: string; reason: string }) => input)
  .handler(async ({ context, data: input }): Promise<CetlsEvent> => {
    const { assertCsrfOrigin, cancelEventWithReason, requireEventActor } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    return cancelEventWithReason(actor, input.id, input.reason);
  });

export const adminDeleteEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { id: string; purge?: boolean }) => input)
  .handler(
    async ({
      context,
      data: input,
    }): Promise<{ deleted: boolean; purged: boolean }> => {
      const { assertCsrfOrigin, requireEventActor, softDeleteOrPurgeEvent } =
        await import("./repository.server");
      assertCsrfOrigin();
      const actor = await requireEventActor("admin", {
        bearerToken: context.bearerToken,
      });
      return softDeleteOrPurgeEvent(actor, input.id, Boolean(input.purge));
    },
  );

export const adminRestoreEventFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data: input }): Promise<CetlsEvent> => {
    const { assertCsrfOrigin, requireEventActor, restoreSoftDeletedEvent } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    return restoreSoftDeletedEvent(actor, input.id);
  });

export const adminUploadImageFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator(
    (input: {
      mimeType: string;
      altText: string;
      dataBase64: string;
      sizeBytes: number;
    }) => input,
  )
  .handler(
    async ({
      context,
      data: input,
    }): Promise<{ url: string; alt: string; id: string }> => {
      const { assertCsrfOrigin, requireEventActor, saveUploadedImage } =
        await import("./repository.server");
      assertCsrfOrigin();
      const actor = await requireEventActor("editor", {
        bearerToken: context.bearerToken,
      });
      return saveUploadedImage(actor, input);
    },
  );

export const adminUpsertUserFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator(
    (input: { email: string; name: string; role: EventUserRole }) => input,
  )
  .handler(async ({ context, data: input }): Promise<EventUserRecord[]> => {
    const { assertCsrfOrigin, requireEventActor, upsertAllowlistUser } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    return upsertAllowlistUser(actor, input);
  });

export const adminRemoveUserFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { email: string }) => input)
  .handler(async ({ context, data: input }): Promise<EventUserRecord[]> => {
    const { assertCsrfOrigin, removeAllowlistUser, requireEventActor } =
      await import("./repository.server");
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    return removeAllowlistUser(actor, input.email);
  });

export const adminQueryAuditFn = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .validator((eventId: string | undefined) => eventId)
  .handler(async ({ context, data: eventId }): Promise<EventAuditEntry[]> => {
    const { queryAuditLogs, requireEventActor } = await import(
      "./repository.server"
    );
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    return queryAuditLogs(actor, eventId);
  });
