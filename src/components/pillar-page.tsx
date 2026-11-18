import { WikiPageView } from "@/components/wiki/wiki-page-view";

export function PillarPage({ domainId }: { domainId: string }) {
  return <WikiPageView pageSlug={`research-${domainId}`} />;
}
