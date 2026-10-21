import { data, getPage, resolveRef, t } from "./site-data";

export function pageMetadata(pageId: string) {
  const p = getPage(pageId);
  const rawTitle =
    pageId === "home"
      ? data.site.homeTitle
      : data.site.titleTemplate.replace("{page}", t(p.title));
  const title = t(rawTitle);
  const description = t(p.seo.description ?? resolveRef(p.seo.descriptionRef!));
  const url = new URL(p.path, data.site.baseUrl).toString();
  const img = p.seo.ogImage ?? data.site.assets.ogImage;
  const ogTitle = p.seo.ogTitle ? t(p.seo.ogTitle) : title;
  const imageUrl = new URL(img.src, data.site.baseUrl).toString();

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:site_name", content: data.org.shortName },
      { property: "og:type", content: "website" },
      { property: "og:image", content: imageUrl },
      { property: "og:image:width", content: String(img.width) },
      { property: "og:image:height", content: String(img.height) },
      { property: "og:image:alt", content: t(img.alt) },
      { name: "twitter:card", content: data.site.twitterCard },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
      ...(p.seo.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
