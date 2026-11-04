import {
  Ban,
  BookOpen,
  Building2,
  Compass,
  Globe,
  Lock,
  Megaphone,
  Mic,
  PencilLine,
  Sparkles,
  Tag,
  Users,
  Video,
} from "lucide-react";
import {
  ACCESS_LABELS,
  CATEGORY_LABELS,
  DOMAIN_LABELS,
  MODE_LABELS,
  formatSeriesLabel,
  type EventAccess,
  type EventCategory,
  type EventDomain,
  type EventMode,
  type EventStatus,
} from "@/lib/events/types";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<EventCategory, typeof Users> = {
  roundtable: Users,
  workshop: BookOpen,
  talk: Mic,
  launch: Sparkles,
  advisory: Compass,
  internal: Building2,
};

export function CategoryBadge({
  category,
  className,
}: {
  category: EventCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category] ?? Megaphone;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{CATEGORY_LABELS[category]}</span>
    </span>
  );
}

export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  if (status === "pending") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-dashed border-accent bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent",
          className,
        )}
      >
        <PencilLine className="size-3.5 shrink-0" aria-hidden="true" />
        <span>Tentative</span>
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-fg/40 bg-soft px-2.5 py-0.5 text-xs font-semibold text-fg",
          className,
        )}
      >
        <Ban className="size-3.5 shrink-0" aria-hidden="true" />
        <span>Cancelled</span>
      </span>
    );
  }
  if (status === "draft" || status === "submitted") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-soft px-2.5 py-0.5 text-xs font-medium text-muted",
          className,
        )}
      >
        <span>{status === "draft" ? "Draft" : "Submitted"}</span>
      </span>
    );
  }
  return null;
}

export function ModeBadge({
  mode,
  className,
}: {
  mode: EventMode;
  className?: string;
}) {
  const Icon =
    mode === "online" ? Video : mode === "hybrid" ? Globe : Building2;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-soft px-2.5 py-0.5 text-xs font-medium text-fg",
        className,
      )}
    >
      <Icon className="size-3 shrink-0 text-muted" aria-hidden="true" />
      <span>{MODE_LABELS[mode]}</span>
    </span>
  );
}

export function AccessBadge({
  access,
  className,
}: {
  access: EventAccess;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium",
        access === "invitation-only"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-surface text-fg",
        className,
      )}
    >
      {access === "invitation-only" && (
        <Lock className="size-3 shrink-0" aria-hidden="true" />
      )}
      <span>{ACCESS_LABELS[access]}</span>
    </span>
  );
}

export function SeriesBadge({
  series,
  className,
}: {
  series: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/30 bg-soft px-2.5 py-0.5 text-xs font-semibold text-primary",
        className,
      )}
    >
      <Tag className="size-3 shrink-0" aria-hidden="true" />
      <span>{formatSeriesLabel(series)}</span>
    </span>
  );
}

export function DomainBadge({
  domain,
  className,
}: {
  domain: EventDomain;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-bg px-2 py-0.5 text-xs font-medium text-fg",
        className,
      )}
    >
      {DOMAIN_LABELS[domain] ?? domain}
    </span>
  );
}
