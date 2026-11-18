import { createFileRoute, Navigate } from "@tanstack/react-router";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/portal")({
  head: () => pageMetadata("portal"),
  component: () => (
    <Navigate to="/admin" search={{ tab: "projects" }} replace />
  ),
});
