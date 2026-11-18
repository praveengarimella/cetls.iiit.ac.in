import type { EventUserRole } from "@/lib/events/types";

export type WikiRevisionStatus = "draft" | "in_review" | "published" | "archived";

export interface WikiRevisionRecord {
  id: number;
  pageSlug: string;
  revNumber: number;
  status: WikiRevisionStatus;
  title: string;
  markdown: string;
  editSummary: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface WikiPageSummary {
  slug: string;
  path: string;
  title: string;
  isCustom: boolean;
  updatedAt: string;
  publishedRevNumber: number | null;
  publishedBy: string | null;
  pendingRevision: {
    id: number;
    revNumber: number;
    status: "draft" | "in_review";
    authorEmail: string;
    editSummary: string;
    updatedAt: string;
  } | null;
}

export interface WikiPagePayload {
  slug: string;
  path: string;
  title: string;
  isCustom: boolean;
  published: WikiRevisionRecord;
  actor: {
    email: string;
    name: string;
    role: EventUserRole;
  } | null;
  workingDraft: WikiRevisionRecord | null;
  revisions: WikiRevisionRecord[];
}

export interface DiffWordSpan {
  text: string;
  kind: "equal" | "added" | "removed";
}

export interface DiffLine {
  kind: "equal" | "added" | "removed";
  oldLineNumber: number | null;
  newLineNumber: number | null;
  text: string;
  spans?: DiffWordSpan[];
}
