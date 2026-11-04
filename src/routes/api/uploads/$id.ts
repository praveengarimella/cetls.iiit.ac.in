import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/events/http.server";
import { getUploadedImageById } from "@/lib/events/repository.server";

export const Route = createFileRoute("/api/uploads/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const img = await getUploadedImageById(params.id);
          if (!img) {
            return jsonResponse({ error: "Image not found." }, 404);
          }
          return new Response(new Uint8Array(img.buffer), {
            status: 200,
            headers: {
              "Content-Type": img.mimeType,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
