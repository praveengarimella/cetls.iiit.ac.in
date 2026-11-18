import { createFileRoute, Navigate } from "@tanstack/react-router";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => pageMetadata("login"),
  component: () => (
    <Navigate to="/admin" search={{ tab: undefined }} replace />
  ),
});
