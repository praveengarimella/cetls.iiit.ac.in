import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { data, t } from "@/lib/site-data";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: data.org.shortName },
      {
        name: "description",
        content: t(data.org.metaDescription),
      },
      { name: "theme-color", content: data.site.themeColor },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: data.site.assets.favicon },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: data.site.fonts.preconnectUrls[0] },
      {
        rel: "preconnect",
        href: data.site.fonts.preconnectUrls[1],
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: data.site.fonts.stylesheetUrl,
      },
      { rel: "manifest", href: data.site.assets.manifest },
      ...(data.site.assets.appleTouchIcon
        ? [{ rel: "apple-touch-icon", href: data.site.assets.appleTouchIcon }]
        : []),
    ],
  }),
  component: () => (
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
  ),
});
