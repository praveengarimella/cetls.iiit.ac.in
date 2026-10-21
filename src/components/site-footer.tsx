import { Link } from "@tanstack/react-router";
import { data, getPage, t } from "@/lib/site-data";

export function SiteFooter() {
  const publishedSocials = data.site.social.profiles.filter((s) => s.published && s.url);

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div>
            <img
              src={data.site.assets.logo.src}
              alt={t(data.site.assets.logo.alt)}
              className="h-16 w-auto sm:h-20"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {data.site.footer.taglineLines.map((line, idx) => (
                <span key={idx}>
                  {idx > 0 && <br />}
                  {t(line)}
                </span>
              ))}
            </p>
            {publishedSocials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {publishedSocials.map((profile) => (
                  <a
                    key={profile.id}
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-accent"
                  >
                    {t(profile.label)}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
            {data.site.footer.groups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="font-medium">{t(group.title)}</p>
                {group.links.map((link) => {
                  const targetPage = getPage(link.pageId);
                  return (
                    <Link
                      key={link.pageId}
                      to={targetPage.path}
                      className="block text-muted hover:text-accent"
                    >
                      {t(link.label)}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 border-t border-border pt-6 text-sm text-muted">
          {t(data.site.footer.copyright)}
        </p>
      </div>
    </footer>
  );
}
