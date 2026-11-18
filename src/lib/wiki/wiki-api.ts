import { createMiddleware, createServerFn } from "@tanstack/react-start";
import type {
  WikiPagePayload,
  WikiPageSummary,
  WikiRevisionRecord,
} from "./types";

const optionalBearerMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    return next({ context: { bearerToken: context.bearerToken } });
  });

export const getWikiPageFn = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ context, data: slug }): Promise<WikiPagePayload | null> => {
    const { getOptionalEventActor } = await import(
      "@/lib/events/repository.server"
    );
    const { getWikiPagePayload } = await import("./repository.server");
    let actor = null;
    try {
      const status = await getOptionalEventActor(context.bearerToken);
      actor = status.actor;
    } catch {
      actor = null;
    }
    return getWikiPagePayload(slug, actor);
  });

export const listWikiPagesFn = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .handler(async ({ context }): Promise<WikiPageSummary[]> => {
    const { requireEventActor } = await import("@/lib/events/repository.server");
    await requireEventActor("editor", { bearerToken: context.bearerToken });
    const { listWikiPagesDirectory } = await import("./repository.server");
    return listWikiPagesDirectory();
  });

export const saveWikiDraftFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator(
    (input: {
      pageSlug: string;
      title: string;
      markdown: string;
      editSummary: string;
    }) => input,
  )
  .handler(async ({ context, data }): Promise<WikiRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    const { saveWikiDraft } = await import("./repository.server");
    return saveWikiDraft(actor, data);
  });

export const submitWikiReviewFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator(
    (input: {
      pageSlug: string;
      title: string;
      markdown: string;
      editSummary: string;
    }) => input,
  )
  .handler(async ({ context, data }): Promise<WikiRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    const { submitWikiForReview } = await import("./repository.server");
    return submitWikiForReview(actor, data);
  });

export const requestWikiChangesFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { revisionId: number; reviewNote: string }) => input)
  .handler(async ({ context, data }): Promise<WikiRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    const { requestWikiChanges } = await import("./repository.server");
    return requestWikiChanges(actor, data);
  });

export const publishWikiRevisionFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator(
    (input: {
      pageSlug: string;
      revisionId?: number;
      title?: string;
      markdown?: string;
      editSummary?: string;
      reviewNote?: string;
    }) => input,
  )
  .handler(async ({ context, data }): Promise<WikiRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    const { publishWikiRevision } = await import("./repository.server");
    return publishWikiRevision(actor, data);
  });

export const revertWikiPageFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { pageSlug: string; targetRevisionId: number }) => input)
  .handler(async ({ context, data }): Promise<WikiRevisionRecord> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("admin", {
      bearerToken: context.bearerToken,
    });
    const { revertWikiPageToRevision } = await import("./repository.server");
    return revertWikiPageToRevision(actor, data);
  });

export const discardWikiDraftFn = createServerFn({ method: "POST" })
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
    const { discardWikiDraft } = await import("./repository.server");
    await discardWikiDraft(actor, data);
    return { ok: true };
  });

export const createCustomWikiPageFn = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { slug: string; title: string; markdown: string }) => input)
  .handler(async ({ context, data }): Promise<{ slug: string; path: string }> => {
    const { assertCsrfOrigin, requireEventActor } = await import(
      "@/lib/events/repository.server"
    );
    assertCsrfOrigin();
    const actor = await requireEventActor("editor", {
      bearerToken: context.bearerToken,
    });
    const { createCustomWikiPage } = await import("./repository.server");
    return createCustomWikiPage(actor, data);
  });
