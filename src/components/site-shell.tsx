import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedSiteDataFn } from "@/lib/cms/cms-api";
import { setActiveSiteData } from "@/lib/site-data";

let hasSyncedPublishedSiteData = false;

export function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (hasSyncedPublishedSiteData) return;
    hasSyncedPublishedSiteData = true;
    getPublishedSiteDataFn()
      .then((published) => {
        if (published) {
          setActiveSiteData(published);
          void router.invalidate();
        }
      })
      .catch(() => {
        hasSyncedPublishedSiteData = false;
      });
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
