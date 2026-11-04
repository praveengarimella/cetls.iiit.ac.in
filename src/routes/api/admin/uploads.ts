import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import {
  assertCsrfOrigin,
  requireEventActor,
  saveUploadedImage,
} from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/admin/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertCsrfOrigin(request);
          const actor = await requireEventActor("editor", { request });
          const contentType = request.headers.get("content-type") ?? "";

          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const file = form.get("file");
            const altText = String(form.get("alt") ?? form.get("altText") ?? "").trim();
            if (!(file instanceof File)) {
              return jsonResponse({ error: "Image file is required." }, 400);
            }
            const buf = Buffer.from(await file.arrayBuffer());
            const uploaded = await saveUploadedImage(actor, {
              mimeType: file.type,
              altText,
              dataBase64: buf.toString("base64"),
              sizeBytes: buf.byteLength,
            });
            return jsonResponse(uploaded, 201);
          }

          const body = (await request.json()) as {
            mimeType?: string;
            alt?: string;
            altText?: string;
            dataBase64?: string;
          };
          const rawB64 = (body.dataBase64 ?? "").replace(/^data:[^;]+;base64,/, "");
          const sizeBytes = Buffer.from(rawB64, "base64").byteLength;
          const uploaded = await saveUploadedImage(actor, {
            mimeType: body.mimeType ?? "",
            altText: body.altText ?? body.alt ?? "",
            dataBase64: rawB64,
            sizeBytes,
          });
          return jsonResponse(uploaded, 201);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
