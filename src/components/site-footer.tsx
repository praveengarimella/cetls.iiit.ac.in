import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div>
            <img src="/logo.png" alt="CETLS, IIIT Hyderabad" className="h-16 w-auto sm:h-20" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Centre for Education Technology and Learning Sciences
              <br />
              International Institute of Information Technology, Hyderabad
            </p>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Explore</p>
              <Link to="/research" className="block text-muted hover:text-accent">
                Research
              </Link>
              <Link to="/platform" className="block text-muted hover:text-accent">
                Platform
              </Link>
              <Link to="/people" className="block text-muted hover:text-accent">
                People
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Engage</p>
              <Link to="/join" className="block text-muted hover:text-accent">
                Join Us
              </Link>
              <Link to="/news" className="block text-muted hover:text-accent">
                News
              </Link>
              <Link to="/contact" className="block text-muted hover:text-accent">
                Contact
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-border pt-6 text-sm text-muted">
          © 2026 Centre for Education Technology and Learning Sciences, IIIT Hyderabad
        </p>
      </div>
    </footer>
  );
}
