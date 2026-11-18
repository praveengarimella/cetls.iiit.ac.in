import type { SiteData } from "@/lib/site-data.types";

export type SiteRevisionStatus = "draft" | "in_review" | "published" | "archived";

export interface SiteRevisionRecord {
  id: number;
  versionNumber: number;
  status: SiteRevisionStatus;
  title: string;
  changeSummary: string;
  content: SiteData;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
}

export interface SiteContentAuditEntry {
  id: number;
  revisionId: number;
  actorEmail: string;
  action: string;
  note: string;
  createdAt: string;
}

export interface ContentDiffItem {
  path: string;
  section: string;
  kind: "added" | "removed" | "changed";
  before: string;
  after: string;
}

export interface CmsDashboardState {
  revisions: SiteRevisionRecord[];
  auditLogs: SiteContentAuditEntry[];
}
