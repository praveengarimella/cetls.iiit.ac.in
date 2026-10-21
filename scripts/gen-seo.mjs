#!/usr/bin/env node
/**
 * Build-time generator for:
 * - public/sitemap.xml (all pages where !seo.noindex)
 * - public/robots.txt (from site.robots + sitemap URL)
 * - public/manifest.webmanifest (from org + site.assets)
 * - src/lib/og/site.json (synced with site-data.json without overriding per-page og:title)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const data = JSON.parse(readFileSync(join(ROOT, "data/site-data.json"), "utf8"));

const tokens = {
  "org.name": data.org.name.value,
  "org.shortName": data.org.shortName,
  "parent.name": data.org.parent.name,
  "parent.shortName": data.org.parent.shortName,
  "parent.abbreviation": data.org.parent.abbreviation,
  year: String(new Date().getFullYear()),
};

function t(s) {
  if (!s) return "";
  return String(s).replace(/\{([a-zA-Z.]+)\}/g, (_, k) => tokens[k] ?? `{${k}}`);
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// 1. public/sitemap.xml
const indexablePages = data.pages.filter((p) => !p.seo?.noindex);
const sitemapUrls = indexablePages
  .map((p) => {
    const loc = new URL(p.path, data.site.baseUrl).toString();
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`;
  })
  .join("\n");

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`;
writeFileSync(join(ROOT, "public/sitemap.xml"), sitemapXml, "utf8");

// 2. public/robots.txt
const allowLines = (data.site.robots.allow ?? ["/"]).map((p) => `Allow: ${p}`);
const disallowLines = (data.site.robots.disallow ?? []).map((p) => `Disallow: ${p}`);
const sitemapUrl = new URL("/sitemap.xml", data.site.baseUrl).toString();
const robotsTxt = [
  "User-agent: *",
  ...allowLines,
  ...disallowLines,
  "",
  `Sitemap: ${sitemapUrl}`,
  "",
].join("\n");
writeFileSync(join(ROOT, "public/robots.txt"), robotsTxt, "utf8");

// 3. public/manifest.webmanifest
const manifest = {
  name: t(data.org.name.value),
  short_name: data.org.shortName,
  start_url: "/",
  display: "standalone",
  theme_color: data.site.themeColor,
  background_color: data.site.backgroundColor,
  icons: [
    {
      src: data.site.assets.favicon,
      type: "image/svg+xml",
      sizes: "any",
    },
    ...(data.site.assets.appleTouchIcon
      ? [
          {
            src: data.site.assets.appleTouchIcon,
            type: "image/png",
            sizes: "180x180",
          },
        ]
      : []),
  ],
};
writeFileSync(
  join(ROOT, "public/manifest.webmanifest"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8",
);

// 4. Sync src/lib/og/site.json (omit static `title` so each route's <title> becomes og:title)
const ogSite = {
  card: "custom",
  color: data.site.themeColor.replace(/^#/, ""),
};
writeFileSync(
  join(ROOT, "src/lib/og/site.json"),
  JSON.stringify(ogSite, null, 2) + "\n",
  "utf8",
);

console.log(
  `[gen-seo] Generated sitemap.xml (${indexablePages.length} URLs), robots.txt, manifest.webmanifest, and synced src/lib/og/site.json.`,
);
