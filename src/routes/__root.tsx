import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { data, setActiveSiteData, t } from "@/lib/site-data";
import type { SiteData } from "@/lib/site-data.types";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: async () => {
    if (import.meta.env.SSR) {
      const { getPublishedSiteData } = await import("@/lib/cms/repository.server");
      const published = await getPublishedSiteData();
      setActiveSiteData(published);
      return published;
    }
    try {
      const res = await fetch("/api/site-data");
      if (res.ok) {
        const published = (await res.json()) as SiteData;
        setActiveSiteData(published);
        return published;
      }
    } catch {
      // Fallback to currently active site data if offline.
    }
    return data;
  },
  head: ({ loaderData }) => {
    const active = loaderData ?? data;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: active.org.shortName },
        {
          name: "description",
          content: t(active.org.metaDescription),
        },
        { name: "theme-color", content: active.site.themeColor },
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: active.site.assets.favicon },
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: active.site.fonts.preconnectUrls[0] },
        {
          rel: "preconnect",
          href: active.site.fonts.preconnectUrls[1],
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: active.site.fonts.stylesheetUrl,
        },
        { rel: "manifest", href: active.site.assets.manifest },
        ...(active.site.assets.appleTouchIcon
          ? [{ rel: "apple-touch-icon", href: active.site.assets.appleTouchIcon }]
          : []),
      ],
    };
  },
  component: RootDocument,
});

function RootDocument() {
  const published = Route.useLoaderData();
  setActiveSiteData(published);

  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
