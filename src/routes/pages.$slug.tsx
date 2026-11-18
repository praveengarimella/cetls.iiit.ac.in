import { createFileRoute } from "@tanstack/react-router";
import { WikiPageView } from "@/components/wiki/wiki-page-view";
import { data } from "@/lib/site-data";

export const Route = createFileRoute("/pages/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} | ${data.org.shortName}` }],
  }),
  component: CustomWikiPage,
});

function CustomWikiPage() {
  const { slug } = Route.useParams();
  return <WikiPageView pageSlug={`page-${slug}`} />;
}
