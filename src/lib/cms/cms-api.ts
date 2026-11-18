import { createMiddleware, createServerFn } from "@tanstack/react-start";
import type { SiteData } from "@/lib/site-data.types";
import type { CmsDashboardState, SiteRevisionRecord } from "./types";

const optionalBearerMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    return next({ context: { bearerToken: context.bearerToken } });
  });

export const getPublishedSiteDataFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteData> => {
    const { getPublishedSiteData } = await import("./repository.server");
    return getPublishedSiteData();
  },
);

export const getCmsDashboardFn = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .handler(async ({ context }): Promise<CmsDashboardState> => {
    const { getOptionalEventActor } = await import("@/lib/events/repository.server");
    const status = await getOptionalEventActor(context.bearerToken);
    if (!status.signedIn || !status.actor) {
      return { revisions: [], auditLogs: [] };
    }
    const { getCmsDashboard } = await import("./repository.server");
    return getCmsDashboard(status.actor);
  });

export const cmsCreateDraftFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator(
    (input: { title?: string; changeSummary?: string; baseRevisionId?: number }) =>
      input,
  )
  .handler(async ({ context, data }): Promise<SiteRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    const { createSiteDraft } = await import("./repository.server");
    return createSiteDraft(actor, data);
  });

export const cmsSaveDraftFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator(
    (input: {
      revisionId: number;
      title: string;
      changeSummary: string;
      content: SiteData;
    }) => input,
  )
  .handler(async ({ context, data }): Promise<SiteRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    const { saveSiteDraft } = await import("./repository.server");
    return saveSiteDraft(actor, data);
  });

export const cmsSubmitForReviewFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { revisionId: number; changeSummary?: string }) => input)
  .handler(async ({ context, data }): Promise<SiteRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    const { submitSiteRevisionForReview } = await import("./repository.server");
    return submitSiteRevisionForReview(actor, data);
  });

export const cmsRequestChangesFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { revisionId: number; reviewNote: string }) => input)
  .handler(async ({ context, data }): Promise<SiteRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    const { requestSiteRevisionChanges } = await import("./repository.server");
    return requestSiteRevisionChanges(actor, data);
  });

export const cmsPublishRevisionFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { revisionId: number; reviewNote?: string }) => input)
  .handler(async ({ context, data }): Promise<SiteRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    const { publishSiteRevision } = await import("./repository.server");
    return publishSiteRevision(actor, data);
  });

export const cmsRollbackRevisionFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { revisionId: number }) => input)
  .handler(async ({ context, data }): Promise<SiteRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    const { rollbackSiteRevision } = await import("./repository.server");
    return rollbackSiteRevision(actor, data);
  });

export const cmsDiscardDraftFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { revisionId: number }) => input)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    const { discardSiteDraft } = await import("./repository.server");
    await discardSiteDraft(actor, data);
    return { ok: true };
  });
