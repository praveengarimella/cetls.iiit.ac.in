import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Copy,
  Eye,
  FileEdit,
  History,
  ImagePlus,
  KeyRound,
  Lock,
  LogOut,
  PencilLine,
  Plus,
  Repeat,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  AccessBadge,
  CategoryBadge,
  EventStatusBadge,
  ModeBadge,
  SeriesBadge,
} from "@/components/events/event-badges";
import { EventCard } from "@/components/events/event-card";
import { SiteShell } from "@/components/site-shell";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
  signOut,
} from "@/lib/auth/client";
import {
  adminApproveEventFn,
  adminCancelEventFn,
  adminCreateEventFn,
  adminDeleteEventFn,
  adminDuplicateEventFn,
  adminQueryAuditFn,
  adminRemoveUserFn,
  adminRestoreEventFn,
  adminSubmitEventFn,
  adminUpdateEventFn,
  adminUploadImageFn,
  adminUpsertUserFn,
  getAdminDashboardFn,
  type AdminDashboardState,
} from "@/lib/events/events-api";
import { formatFullDateIst, getIstParts } from "@/lib/events/ist-date";
import {
  expandEventOccurrences,
  formatRRuleHumanReadable,
} from "@/lib/events/recurrence";
import { slugifyTitle, type EventMutationInput } from "@/lib/events/schema";
import { getInitialAdminUsers } from "@/lib/events/seed-data";
import {
  ACCESS_LABELS,
  CATEGORY_LABELS,
  DOMAIN_LABELS,
  EVENT_ACCESS_TYPES,
  EVENT_CATEGORIES,
  EVENT_DOMAINS,
  EVENT_MODES,
  MODE_LABELS,
  STATUS_LABELS,
  type CetlsEvent,
  type EventAccess,
  type EventCategory,
  type EventDomain,
  type EventLink,
  type EventMode,
  type EventUserRole,
} from "@/lib/events/types";
import { pageMetadata } from "@/lib/seo";
import { data, t } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => pageMetadata("admin"),
  component: EventsAdminPage,
});

const PENDING_FIELD_OPTIONS = [
  { id: "venue.name", label: "Venue Name (shows 'To be confirmed')" },
  { id: "venue.city", label: "City (shows 'To be confirmed')" },
  { id: "start time", label: "Start Time (shows 'Time: To be confirmed')" },
  { id: "end time", label: "End Time (shows 'Time: To be confirmed')" },
  { id: "onlineUrl", label: "Online Meeting Link (shows 'To be confirmed')" },
] as const;

interface EditorFormState {
  id: string | null;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: EventCategory;
  domains: EventDomain[];
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  allDay: boolean;
  mode: EventMode;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueMapUrl: string;
  onlineUrl: string;
  access: EventAccess;
  eksaqSeries: boolean;
  customSeries: string;
  partnersText: string;
  imageUrl: string;
  imageAlt: string;
  pendingFields: string[];
  hasRecurrence: boolean;
  rruleFreq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  rruleInterval: number;
  rruleCount: string;
  rruleUntil: string;
  exdatesText: string;
  recurrenceParentId: string | null;
  recurrenceOriginalDate: string | null;
  links: EventLink[];
}

function emptyFormState(): EditorFormState {
  return {
    id: null,
    slug: "",
    title: "",
    summary: "",
    description: "",
    category: "roundtable",
    domains: ["k12"],
    startDate: "2026-12-10",
    startTime: "10:00",
    endDate: "2026-12-10",
    endTime: "16:30",
    allDay: false,
    mode: "in-person",
    venueName: "",
    venueAddress: "",
    venueCity: "Hyderabad",
    venueMapUrl: "",
    onlineUrl: "",
    access: "open",
    eksaqSeries: false,
    customSeries: "",
    partnersText: "",
    imageUrl: "",
    imageAlt: "",
    pendingFields: [],
    hasRecurrence: false,
    rruleFreq: "MONTHLY",
    rruleInterval: 1,
    rruleCount: "4",
    rruleUntil: "",
    exdatesText: "",
    recurrenceParentId: null,
    recurrenceOriginalDate: null,
    links: [],
  };
}

function eventToFormState(ev: CetlsEvent): EditorFormState {
  const s = getIstParts(ev.start);
  const e = getIstParts(ev.end);
  const startClock = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  const endClock = `${String(e.hour).padStart(2, "0")}:${String(e.minute).padStart(2, "0")}`;

  const eksaqSeries = ev.series.includes("eksaq-partnership");
  const otherSeries = ev.series
    .filter((tag) => tag !== "eksaq-partnership")
    .join(", ");

  let rruleFreq: EditorFormState["rruleFreq"] = "MONTHLY";
  let rruleInterval = 1;
  let rruleCount = "";
  let rruleUntil = "";
  if (ev.recurrence?.rrule) {
    for (const part of ev.recurrence.rrule.split(";")) {
      const [k, v] = part.split("=");
      if (!k || !v) continue;
      const key = k.trim().toUpperCase();
      const val = v.trim().toUpperCase();
      if (
        key === "FREQ" &&
        (val === "DAILY" || val === "WEEKLY" || val === "MONTHLY" || val === "YEARLY")
      ) {
        rruleFreq = val;
      } else if (key === "INTERVAL") {
        rruleInterval = Math.max(1, Number.parseInt(val, 10) || 1);
      } else if (key === "COUNT") {
        rruleCount = val;
      } else if (key === "UNTIL") {
        if (/^\d{8}/.test(val)) {
          rruleUntil = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
        } else {
          rruleUntil = val.slice(0, 10);
        }
      }
    }
  }

  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    summary: ev.summary,
    description: ev.description ?? "",
    category: ev.category,
    domains: [...ev.domains],
    startDate: s.isoDate,
    startTime: startClock,
    endDate: e.isoDate,
    endTime: endClock,
    allDay: ev.allDay,
    mode: ev.mode,
    venueName: ev.venue?.name ?? "",
    venueAddress: ev.venue?.address ?? "",
    venueCity: ev.venue?.city ?? "",
    venueMapUrl: ev.venue?.mapUrl ?? "",
    onlineUrl: ev.onlineUrl ?? "",
    access: ev.access,
    eksaqSeries,
    customSeries: otherSeries,
    partnersText: ev.partners.join(", "),
    imageUrl: ev.image?.url ?? "",
    imageAlt: ev.image?.alt ?? "",
    pendingFields: [...ev.pendingFields],
    hasRecurrence: Boolean(ev.recurrence?.rrule),
    rruleFreq,
    rruleInterval,
    rruleCount,
    rruleUntil,
    exdatesText: (ev.recurrence?.exdates ?? []).join(", "),
    recurrenceParentId: ev.recurrenceParentId ?? null,
    recurrenceOriginalDate: ev.recurrenceOriginalDate ?? null,
    links: ev.links.length > 0 ? [...ev.links] : [],
  };
}

function formStateToMutationInput(form: EditorFormState): EventMutationInput {
  const startIso = form.allDay
    ? `${form.startDate}T00:00:00+05:30`
    : `${form.startDate}T${form.startTime || "10:00"}:00+05:30`;
  const endIso = form.allDay
    ? `${form.endDate || form.startDate}T23:59:59+05:30`
    : `${form.endDate || form.startDate}T${form.endTime || "17:00"}:00+05:30`;

  const series: string[] = [];
  if (form.eksaqSeries) series.push("eksaq-partnership");
  for (const tag of form.customSeries.split(",")) {
    const clean = tag.trim().toLowerCase();
    if (clean && !series.includes(clean)) series.push(clean);
  }

  const partners = form.partnersText
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let recurrence: EventMutationInput["recurrence"] = null;
  if (form.hasRecurrence) {
    const parts = [`FREQ=${form.rruleFreq}`, `INTERVAL=${Math.max(1, form.rruleInterval)}`];
    if (form.rruleUntil.trim()) {
      parts.push(`UNTIL=${form.rruleUntil.trim().replace(/-/g, "")}`);
    } else if (form.rruleCount.trim()) {
      const cnt = Number.parseInt(form.rruleCount.trim(), 10);
      if (cnt > 0) parts.push(`COUNT=${cnt}`);
    }
    const exdates = form.exdatesText
      .split(",")
      .map((d) => d.trim().slice(0, 10))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    recurrence = { rrule: parts.join(";"), exdates };
  }

  return {
    slug: form.slug.trim() || slugifyTitle(form.title),
    title: form.title.trim(),
    summary: form.summary.trim(),
    description: form.description.trim() || null,
    category: form.category,
    domains: form.domains,
    start: startIso,
    end: endIso,
    allDay: form.allDay,
    timezone: "Asia/Kolkata",
    recurrence,
    recurrenceParentId: form.recurrenceParentId,
    recurrenceOriginalDate: form.recurrenceOriginalDate,
    mode: form.mode,
    venue: {
      name: form.venueName.trim(),
      address: form.venueAddress.trim() || undefined,
      city: form.venueCity.trim(),
      mapUrl: form.venueMapUrl.trim() || undefined,
    },
    onlineUrl: form.onlineUrl.trim() || null,
    access: form.access,
    series,
    partners,
    image: form.imageUrl.trim()
      ? { url: form.imageUrl.trim(), alt: form.imageAlt.trim() }
      : null,
    pendingFields: form.pendingFields,
    links: form.links.filter((l) => l.label.trim() && l.url.trim()),
  };
}

/**
 * Client-side automatic image resize/compression so uploaded JPG/PNG/WebP images stay well under 2 MB.
 */
async function resizeImageFileClientSide(
  file: File,
  maxWidth = 1400,
): Promise<{ mimeType: string; dataBase64: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const b64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
          resolve({
            mimeType: file.type,
            dataBase64: b64,
            sizeBytes: file.size,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outMime =
          file.type === "image/png" || file.type === "image/webp"
            ? file.type
            : "image/jpeg";
        const compressedDataUrl = canvas.toDataURL(outMime, 0.86);
        const b64 = compressedDataUrl.replace(/^data:[^;]+;base64,/, "");
        const approxBytes = Math.ceil((b64.length * 3) / 4);
        resolve({
          mimeType: outMime,
          dataBase64: b64,
          sizeBytes: approxBytes,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function EventsAdminPage() {
  const initialAdmins = useMemo(() => getInitialAdminUsers(), []);

  const [dashboard, setDashboard] = useState<AdminDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auth form states when signed out
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Admin navigation tabs
  const [activeTab, setActiveTab] = useState<
    "events" | "editor" | "audit" | "users"
  >("events");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleted, setShowDeleted] = useState(false);

  // Event editor state
  const [form, setForm] = useState<EditorFormState>(() => emptyFormState());
  const [showPreview, setShowPreview] = useState(false);

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<CetlsEvent | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");

  // Audit filter state
  const [auditFilterEventId, setAuditFilterEventId] = useState<string>("");

  // Allowlist user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<EventUserRole>("editor");

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const state = await getAdminDashboardFn();
      setDashboard(state);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin console.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  async function handleAuthSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (authMode === "signup") {
        const res = await authClient.signUp.email({
          email: authEmail.trim(),
          password: authPassword,
          name: authName.trim() || authEmail.trim().split("@")[0] || "CETLS User",
        });
        if (res.error) {
          setError(res.error.message ?? "Could not create account.");
        } else {
          await refreshDashboard();
        }
      } else {
        const res = await authClient.signIn.email({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (res.error) {
          setError(res.error.message ?? "Invalid email or password.");
        } else {
          await refreshDashboard();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut("/admin");
      await refreshDashboard();
    } finally {
      setBusy(false);
    }
  }

  function startNewEvent() {
    setForm(emptyFormState());
    setShowPreview(false);
    setError(null);
    setNotice(null);
    setActiveTab("editor");
  }

  function startEditEvent(ev: CetlsEvent) {
    setForm(eventToFormState(ev));
    setShowPreview(false);
    setError(null);
    setNotice(null);
    setActiveTab("editor");
  }

  function startSingleOccurrenceOverride(ev: CetlsEvent, occurrenceDate: string) {
    const base = eventToFormState(ev);
    setForm({
      ...base,
      id: null,
      slug: `${ev.slug}-${occurrenceDate}`.slice(0, 80),
      title: `${ev.title} (${occurrenceDate})`.slice(0, 120),
      startDate: occurrenceDate,
      endDate: occurrenceDate,
      hasRecurrence: false,
      recurrenceParentId: ev.id,
      recurrenceOriginalDate: occurrenceDate,
    });
    setNotice(
      `Creating single-occurrence override for ${occurrenceDate}. Saving will add ${occurrenceDate} to the parent series' EXDATE list.`,
    );
    setActiveTab("editor");
  }

  async function handleSaveEvent(
    e: FormEvent<HTMLFormElement>,
    submitForApprovalAfterSave = false,
  ) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const mutationInput = formStateToMutationInput(form);
      let saved: CetlsEvent;
      if (form.id) {
        saved = await adminUpdateEventFn({
          data: {
            id: form.id,
            patch: {
              ...mutationInput,
              ...(submitForApprovalAfterSave ? { status: "submitted" } : {}),
            },
          },
        });
        if (submitForApprovalAfterSave && saved.status !== "submitted") {
          saved = await adminSubmitEventFn({ data: { id: saved.id } });
        }
        setNotice(
          `Saved "${saved.title}". Status is now "${STATUS_LABELS[saved.status]}" (awaiting admin Approve & Publish).`,
        );
      } else {
        saved = await adminCreateEventFn({
          data: {
            ...mutationInput,
            status: submitForApprovalAfterSave ? "submitted" : "draft",
          },
        });
        setNotice(
          `Created "${saved.title}" as ${STATUS_LABELS[saved.status]}. An admin must click Approve & Publish before it appears publicly.`,
        );
      }
      setForm(eventToFormState(saved));
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprovePublish(
    eventId: string,
    mode?: "published" | "pending",
  ) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const approved = await adminApproveEventFn({ data: { id: eventId, mode } });
      setNotice(
        `Approved & published "${approved.title}" with status "${STATUS_LABELS[approved.status]}".`,
      );
      if (form.id === approved.id) {
        setForm(eventToFormState(approved));
      }
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitForApproval(eventId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const submitted = await adminSubmitEventFn({ data: { id: eventId } });
      setNotice(`Submitted "${submitted.title}" for admin approval.`);
      if (form.id === submitted.id) {
        setForm(eventToFormState(submitted));
      }
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(eventId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const copy = await adminDuplicateEventFn({ data: { id: eventId } });
      setNotice(`Duplicated as draft "${copy.title}" (${copy.slug}).`);
      await refreshDashboard();
      startEditEvent(copy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmCancel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cancelTarget) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const cancelled = await adminCancelEventFn({
        data: { id: cancelTarget.id, reason: cancelReasonText },
      });
      setNotice(`Cancelled "${cancelled.title}".`);
      setCancelTarget(null);
      setCancelReasonText("");
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSoftDelete(eventId: string, purge = false) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminDeleteEventFn({ data: { id: eventId, purge } });
      setNotice(
        purge
          ? "Event permanently purged."
          : "Event soft-deleted (hidden from public view; can be restored).",
      );
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(eventId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const restored = await adminRestoreEventFn({ data: { id: eventId } });
      setNotice(`Restored "${restored.title}".`);
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.imageAlt.trim()) {
      setError(
        "Please enter descriptive Image Alt Text before uploading an image (required for accessibility).",
      );
      e.target.value = "";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resized = await resizeImageFileClientSide(file);
      const uploaded = await adminUploadImageFn({
        data: {
          mimeType: resized.mimeType,
          altText: form.imageAlt.trim(),
          dataBase64: resized.dataBase64,
          sizeBytes: resized.sizeBytes,
        },
      });
      setForm((prev) => ({
        ...prev,
        imageUrl: uploaded.url,
        imageAlt: uploaded.alt,
      }));
      setNotice("Image resized and uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleAddUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const users = await adminUpsertUserFn({
        data: {
          email: newUserEmail,
          name: newUserName,
          role: newUserRole,
        },
      });
      setDashboard((prev) => (prev ? { ...prev, users } : prev));
      setNewUserEmail("");
      setNewUserName("");
      setNotice(`Allowlist updated for ${newUserEmail.trim().toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update allowlist.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveUser(email: string) {
    setBusy(true);
    setError(null);
    try {
      const users = await adminRemoveUserFn({ data: { email } });
      setDashboard((prev) => (prev ? { ...prev, users } : prev));
      setNotice(`Removed ${email} from allowlist.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove user.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFilterAudit(eventId: string) {
    setAuditFilterEventId(eventId);
    setBusy(true);
    try {
      const logs = await adminQueryAuditFn({ data: eventId || undefined });
      setDashboard((prev) => (prev ? { ...prev, auditLogs: logs } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load audit log.");
    } finally {
      setBusy(false);
    }
  }

  const previewEvent = useMemo((): CetlsEvent => {
    const m = formStateToMutationInput(form);
    return {
      id: form.id ?? "preview-id",
      slug: m.slug || "preview-event",
      title: m.title || "Untitled Event",
      summary: m.summary || "Event summary preview.",
      description: m.description ?? null,
      category: m.category,
      domains: (m.domains ?? []) as EventDomain[],
      start: m.start,
      end: m.end ?? m.start,
      allDay: Boolean(m.allDay),
      timezone: "Asia/Kolkata",
      recurrence: m.recurrence ?? null,
      mode: m.mode,
      venue: {
        name: m.venue?.name ?? "",
        address: m.venue?.address,
        city: m.venue?.city ?? "",
        mapUrl: m.venue?.mapUrl,
      },
      onlineUrl: m.onlineUrl ?? null,
      access: m.access,
      series: m.series ?? [],
      partners: m.partners ?? [],
      image: m.image ?? null,
      status:
        (m.pendingFields?.length ?? 0) > 0 ? "pending" : "published",
      approvedBy: dashboard?.actor?.email ?? null,
      approvedAt: new Date().toISOString(),
      pendingFields: m.pendingFields ?? [],
      cancelReason: null,
      links: m.links ?? [],
      deleted: false,
      createdBy: dashboard?.actor?.email ?? "",
      createdAt: new Date().toISOString(),
      updatedBy: dashboard?.actor?.email ?? "",
      updatedAt: new Date().toISOString(),
    };
  }, [form, dashboard?.actor?.email]);

  const visibleEvents = useMemo(() => {
    const list = dashboard?.events ?? [];
    return list.filter((ev) => {
      if (!showDeleted && ev.deleted) return false;
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      return true;
    });
  }, [dashboard?.events, showDeleted, statusFilter]);

  const currentEditingEvent = useMemo(() => {
    if (!form.id || !dashboard?.events) return null;
    return dashboard.events.find((e) => e.id === form.id) ?? null;
  }, [form.id, dashboard?.events]);

  // 1. Loading state
  if (loading && !dashboard) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-4xl px-5 py-16 sm:px-6">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-muted">Loading Events Administration…</p>
          </div>
        </main>
      </SiteShell>
    );
  }

  // 2. Signed out -> Dedicated Admin Sign-In screen (SSO + Institutional Email)
  if (!dashboard?.signedIn) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-md px-5 py-14 sm:px-6 sm:py-20">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                  {data.org.shortName} · Events Administration
                </p>
                <h1 className="font-display text-2xl font-semibold">
                  Admin &amp; Editor Sign In
                </h1>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted">
              Sign in with your allowlisted institutional account to create, edit,
              submit, and approve {data.org.shortName} calendar events. Shared
              passwords are not permitted.
            </p>

            <div className="mt-4 rounded-xl border border-border bg-bg p-3.5 text-xs text-muted">
              <p className="font-semibold text-fg">Initial Allowlisted Admins:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {initialAdmins.map((adm) => (
                  <li key={adm.email}>
                    {adm.name} (<span className="font-mono">{adm.email}</span>)
                  </li>
                ))}
              </ul>
            </div>

            {authEnabled ? (
              <>
                <div className="mt-6 space-y-2.5">
                  {GROK_PROVIDERS.map((p) => (
                    <button
                      key={p.providerId}
                      type="button"
                      onClick={() =>
                        signIn(p.providerId, { callbackURL: "/admin" })
                      }
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
                    >
                      Continue with {p.label}
                    </button>
                  ))}
                </div>

                <div className="my-6 flex items-center gap-3 text-xs text-muted">
                  <div className="h-px flex-1 bg-border" />
                  <span>or with institutional account</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="mb-4 grid grid-cols-2 rounded-lg bg-soft p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setError(null);
                    }}
                    className={cn(
                      "min-h-9 rounded-md py-1.5 transition-colors",
                      authMode === "signin"
                        ? "bg-surface text-fg shadow-xs"
                        : "text-muted",
                    )}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setError(null);
                    }}
                    className={cn(
                      "min-h-9 rounded-md py-1.5 transition-colors",
                      authMode === "signup"
                        ? "bg-surface text-fg shadow-xs"
                        : "text-muted",
                    )}
                  >
                    Register Email
                  </button>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-accent/50 bg-accent/10 p-3 text-xs font-medium text-accent"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authMode === "signup" && (
                    <div>
                      <label
                        htmlFor="admin-auth-name"
                        className="block text-xs font-medium text-fg"
                      >
                        Full Name
                      </label>
                      <input
                        id="admin-auth-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="admin-auth-email"
                      className="block text-xs font-medium text-fg"
                    >
                      Institutional Email
                    </label>
                    <input
                      id="admin-auth-email"
                      type="email"
                      required
                      autoComplete="username"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-auth-password"
                      className="block text-xs font-medium text-fg"
                    >
                      Password
                    </label>
                    <input
                      id="admin-auth-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete={
                        authMode === "signup"
                          ? "new-password"
                          : "current-password"
                      }
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {authMode === "signup" ? (
                      <>
                        <KeyRound className="size-4" aria-hidden="true" />
                        <span>
                          {busy ? "Creating account…" : "Create Account & Continue"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="size-4" aria-hidden="true" />
                        <span>{busy ? "Signing in…" : "Sign in to Events Admin"}</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-6 text-sm text-muted">
                Authentication is currently disabled in this environment.
              </p>
            )}
          </div>
        </main>
      </SiteShell>
    );
  }

  // 3. Signed in, but NOT on the allowlist (Acceptance Criterion #6: "A user who isn't on the allowlist is refused.")
  if (!dashboard.actor) {
    return (
      <SiteShell>
        <main className="mx-auto max-w-lg px-5 py-16 sm:px-6 sm:py-24">
          <div
            role="alert"
            className="rounded-2xl border-2 border-accent/60 bg-surface p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 text-accent">
              <ShieldAlert className="size-6 shrink-0" aria-hidden="true" />
              <h1 className="font-display text-2xl font-semibold">
                Access Refused — Not on Allowlist
              </h1>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-fg">
              You are signed in as{" "}
              <strong className="font-mono">{dashboard.email}</strong>, which is
              not on the {data.org.shortName} Events Calendar allowlist.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Only allowlisted {data.org.shortName} administrators and editors can
              access <code className="font-mono">/admin</code>. Ask an initial
              administrator to add your institutional email under the Allowlist
              Users tab.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span>Sign out &amp; switch account</span>
              </button>
              <Link
                to="/events"
                className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-4 py-2.5 text-xs font-semibold text-fg hover:border-primary"
              >
                View Public Calendar
              </Link>
            </div>
          </div>
        </main>
      </SiteShell>
    );
  }

  const actor = dashboard.actor;
  const isAdmin = actor.role === "admin";

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        {/* Top Admin Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary uppercase">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                <span>Role: {actor.role}</span>
              </span>
              <span className="text-xs text-muted">
                Signed in as <strong className="text-fg">{actor.name}</strong> (
                <span className="font-mono">{actor.email}</span>)
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Events Calendar Administration
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={startNewEvent}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>New Event</span>
            </button>
            <Link
              to="/events"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-fg hover:border-primary"
            >
              Public Calendar →
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-xs font-medium text-muted hover:text-fg"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-accent bg-accent/10 p-4 text-xs font-medium text-accent"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs font-medium text-primary"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Events administration sections"
          className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "events"}
            onClick={() => setActiveTab("events")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
              activeTab === "events"
                ? "bg-primary text-primary-fg"
                : "border border-border bg-surface text-fg hover:border-primary",
            )}
          >
            <span>All Events ({dashboard.events.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "editor"}
            onClick={() => setActiveTab("editor")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
              activeTab === "editor"
                ? "bg-primary text-primary-fg"
                : "border border-border bg-surface text-fg hover:border-primary",
            )}
          >
            <FileEdit className="size-3.5" aria-hidden="true" />
            <span>{form.id ? `Edit: ${form.title || form.slug}` : "Create Event"}</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "audit"}
                onClick={() => setActiveTab("audit")}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
                  activeTab === "audit"
                    ? "bg-primary text-primary-fg"
                    : "border border-border bg-surface text-fg hover:border-primary",
                )}
              >
                <History className="size-3.5" aria-hidden="true" />
                <span>Audit Log ({dashboard.auditLogs.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "users"}
                onClick={() => setActiveTab("users")}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
                  activeTab === "users"
                    ? "bg-primary text-primary-fg"
                    : "border border-border bg-surface text-fg hover:border-primary",
                )}
              >
                <Users className="size-3.5" aria-hidden="true" />
                <span>Allowlist Users ({dashboard.users.length})</span>
              </button>
            </>
          )}
        </div>

        {/* TAB 1: EVENTS LIST & WORKFLOW */}
        {activeTab === "events" && (
          <section className="mt-6" aria-label="Manage events">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="admin-status-filter"
                  className="text-xs font-semibold text-fg"
                >
                  Filter by Status:
                </label>
                <select
                  id="admin-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="min-h-10 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft (Private)</option>
                  <option value="submitted">Submitted for Approval (Private)</option>
                  <option value="pending">Pending / Tentative (Public)</option>
                  <option value="published">Published / Confirmed (Public)</option>
                  <option value="cancelled">Cancelled (Public)</option>
                </select>
              </div>

              {isAdmin && (
                <label className="inline-flex items-center gap-2 text-xs font-medium text-fg">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  <span>Show soft-deleted events</span>
                </label>
              )}
            </div>

            <div className="space-y-4">
              {visibleEvents.map((ev) => {
                const needsApproval =
                  ev.status === "draft" || ev.status === "submitted";
                const recurringInstances = ev.recurrence?.rrule
                  ? expandEventOccurrences(ev, "2026-09-01", "2027-12-31").slice(0, 6)
                  : [];

                return (
                  <div
                    key={ev.id}
                    className={cn(
                      "rounded-2xl border p-5 transition-colors",
                      ev.deleted
                        ? "border-accent/40 bg-soft/60 opacity-75"
                        : ev.status === "pending"
                          ? "border-2 border-dashed border-accent/60 bg-surface"
                          : "border-border bg-surface",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge category={ev.category} />
                        <EventStatusBadge status={ev.status} />
                        <ModeBadge mode={ev.mode} />
                        <AccessBadge access={ev.access} />
                        {ev.series.map((tag) => (
                          <SeriesBadge key={tag} series={tag} />
                        ))}
                        {ev.deleted && (
                          <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent uppercase">
                            Soft Deleted
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-muted">
                        /{ev.slug}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h2 className="font-display text-xl font-semibold">
                          {ev.title}
                        </h2>
                        <p className="mt-1 text-sm text-muted">{ev.summary}</p>
                        <p className="mt-2 text-xs text-fg">
                          <strong>Start (IST):</strong> {ev.start} ·{" "}
                          <strong>Venue:</strong> {ev.venue?.name || "TBC"} (
                          {ev.venue?.city || "TBC"})
                        </p>
                        {ev.pendingFields.length > 0 && (
                          <p className="mt-1 text-xs font-medium text-accent">
                            Pending fields: {ev.pendingFields.join(", ")}
                          </p>
                        )}
                        {ev.approvedBy && (
                          <p className="mt-1 text-xs text-muted">
                            Approved by {ev.approvedBy} at {ev.approvedAt}
                          </p>
                        )}
                      </div>

                      {/* Action Controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditEvent(ev)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-fg hover:border-primary"
                        >
                          <FileEdit className="size-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDuplicate(ev.id)}
                          disabled={busy}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-fg hover:border-primary"
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                          <span>Duplicate</span>
                        </button>

                        {ev.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => void handleSubmitForApproval(ev.id)}
                            disabled={busy}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            <Send className="size-3.5" aria-hidden="true" />
                            <span>Submit for Approval</span>
                          </button>
                        )}

                        {isAdmin && !ev.deleted && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void handleApprovePublish(
                                  ev.id,
                                  ev.pendingFields.length > 0
                                    ? "pending"
                                    : "published",
                                )
                              }
                              disabled={busy}
                              className={cn(
                                "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors",
                                needsApproval
                                  ? "bg-primary text-primary-fg hover:bg-primary-hover"
                                  : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
                              )}
                            >
                              <CheckCircle2
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              <span>
                                {ev.pendingFields.length > 0
                                  ? "Approve & Publish (Tentative)"
                                  : "Approve & Publish"}
                              </span>
                            </button>

                            {ev.status !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelTarget(ev);
                                  setCancelReasonText(ev.cancelReason ?? "");
                                }}
                                disabled={busy}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-fg hover:border-accent hover:text-accent"
                              >
                                <Ban className="size-3.5" aria-hidden="true" />
                                <span>Cancel</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => void handleSoftDelete(ev.id, false)}
                              disabled={busy}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                              <span>Soft Delete</span>
                            </button>
                          </>
                        )}

                        {isAdmin && ev.deleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleRestore(ev.id)}
                              disabled={busy}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-fg"
                            >
                              <RotateCcw className="size-3.5" aria-hidden="true" />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSoftDelete(ev.id, true)}
                              disabled={busy}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-accent"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                              <span>Hard Purge</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Recurring Event Single-Occurrence Override Controls */}
                    {recurringInstances.length > 0 && (
                      <div className="mt-4 rounded-xl border border-border bg-bg p-3">
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Repeat className="size-3.5" aria-hidden="true" />
                          <span>
                            Recurring Series (
                            {formatRRuleHumanReadable(ev.recurrence?.rrule)}) — Edit
                            a single occurrence:
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {recurringInstances.map((occ) => (
                            <button
                              key={occ.occurrenceKey}
                              type="button"
                              onClick={() =>
                                startSingleOccurrenceOverride(
                                  ev,
                                  occ.occurrenceDate,
                                )
                              }
                              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:border-primary hover:text-primary"
                            >
                              <span>Override {occ.occurrenceDate}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Cancel Event Modal Dialog */}
        {cancelTarget && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 p-4"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg">
              <h2
                id="cancel-dialog-title"
                className="font-display text-xl font-semibold"
              >
                Cancel Event: {cancelTarget.title}
              </h2>
              <p className="mt-2 text-xs text-muted">
                Cancelled events remain visible on the public calendar with a
                &ldquo;Cancelled&rdquo; badge and <code className="font-mono">EventCancelled</code>{" "}
                schema.org status.
              </p>
              <form onSubmit={handleConfirmCancel} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="cancel-reason-input"
                    className="block text-xs font-semibold text-fg"
                  >
                    Reason for cancellation (required)
                  </label>
                  <textarea
                    id="cancel-reason-input"
                    required
                    rows={3}
                    value={cancelReasonText}
                    onChange={(e) => setCancelReasonText(e.target.value)}
                    placeholder="e.g., Postponed to January 2027 due to travel schedule."
                    className="mt-1 w-full rounded-lg border border-border bg-bg p-3 text-sm text-fg focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelTarget(null)}
                    className="min-h-10 rounded-lg border border-border bg-bg px-4 py-2 text-xs font-semibold text-fg"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-10 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-primary-fg"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE / EDIT EVENT + LIVE PREVIEW */}
        {activeTab === "editor" && (
          <section className="mt-6" aria-label="Event editor">
            {/* Explicit Approval Status Bar when editing an existing event */}
            {currentEditingEvent && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted uppercase">
                      Current Status:
                    </span>
                    <EventStatusBadge status={currentEditingEvent.status} />
                    <span className="text-xs font-semibold text-fg">
                      ({STATUS_LABELS[currentEditingEvent.status]})
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Per Decision C3, saving edits to any event places it in{" "}
                    <strong>draft/submitted</strong> state until an administrator
                    clicks <strong>Approve &amp; Publish</strong>.
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void handleApprovePublish(
                          currentEditingEvent.id,
                          form.pendingFields.length > 0 ? "pending" : "published",
                        )
                      }
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      <span>
                        {form.pendingFields.length > 0
                          ? "Approve & Publish as Tentative (Pending)"
                          : "Approve & Publish (Confirmed)"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">
                {form.id ? "Edit Event" : "Create New Event"}
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:border-primary"
              >
                <Eye className="size-4" aria-hidden="true" />
                <span>{showPreview ? "Hide Preview" : "Preview Event"}</span>
              </button>
            </div>

            {showPreview && (
              <div className="mb-8 rounded-2xl border-2 border-primary/30 bg-bg p-5">
                <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">
                  Live Public Card Preview
                </p>
                <EventCard event={previewEvent} />
              </div>
            )}

            <form
              onSubmit={(e) => void handleSaveEvent(e, false)}
              className="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="ev-title"
                    className="block text-xs font-semibold text-fg"
                  >
                    Event Title (required, max 120 chars)
                  </label>
                  <input
                    id="ev-title"
                    type="text"
                    required
                    maxLength={120}
                    value={form.title}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        title: nextTitle,
                        slug: prev.id ? prev.slug : slugifyTitle(nextTitle),
                      }));
                    }}
                    className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ev-slug"
                    className="block text-xs font-semibold text-fg"
                  >
                    URL Slug (unique, kebab-case)
                  </label>
                  <input
                    id="ev-slug"
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 font-mono text-xs text-fg focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ev-category"
                    className="block text-xs font-semibold text-fg"
                  >
                    Category (required)
                  </label>
                  <select
                    id="ev-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value as EventCategory,
                      }))
                    }
                    className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                  >
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="ev-summary"
                    className="block text-xs font-semibold text-fg"
                  >
                    Summary (required, max 280 chars)
                  </label>
                  <textarea
                    id="ev-summary"
                    required
                    maxLength={280}
                    rows={2}
                    value={form.summary}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, summary: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-bg p-3 text-sm text-fg focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="ev-description"
                    className="block text-xs font-semibold text-fg"
                  >
                    Full Description (Markdown supported, sanitized)
                  </label>
                  <textarea
                    id="ev-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-bg p-3 text-sm text-fg focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Date, Time & Recurrence (IST) */}
              <fieldset className="rounded-xl border border-border bg-bg p-4">
                <legend className="px-2 text-xs font-semibold text-primary uppercase">
                  Date, Time (Asia/Kolkata IST) &amp; Recurrence
                </legend>
                <div className="mt-2 grid gap-4 sm:grid-cols-4">
                  <div>
                    <label
                      htmlFor="ev-start-date"
                      className="block text-xs font-semibold text-fg"
                    >
                      Start Date
                    </label>
                    <input
                      id="ev-start-date"
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                          endDate:
                            prev.endDate < e.target.value
                              ? e.target.value
                              : prev.endDate,
                        }))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ev-start-time"
                      className="block text-xs font-semibold text-fg"
                    >
                      Start Time (IST)
                    </label>
                    <input
                      id="ev-start-time"
                      type="time"
                      disabled={form.allDay}
                      value={form.startTime}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ev-end-date"
                      className="block text-xs font-semibold text-fg"
                    >
                      End Date
                    </label>
                    <input
                      id="ev-end-date"
                      type="date"
                      required
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ev-end-time"
                      className="block text-xs font-semibold text-fg"
                    >
                      End Time (IST)
                    </label>
                    <input
                      id="ev-end-time"
                      type="time"
                      disabled={form.allDay}
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-fg">
                    <input
                      type="checkbox"
                      checked={form.allDay}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, allDay: e.target.checked }))
                      }
                      className="size-4 accent-primary"
                    />
                    <span>All-day event</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-fg">
                    <input
                      type="checkbox"
                      checked={form.hasRecurrence}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          hasRecurrence: e.target.checked,
                        }))
                      }
                      className="size-4 accent-primary"
                    />
                    <span>Recurring event (RFC 5545 RRULE)</span>
                  </label>
                </div>

                {form.hasRecurrence && (
                  <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-4">
                    <div>
                      <label
                        htmlFor="ev-rrule-freq"
                        className="block text-xs font-semibold text-fg"
                      >
                        Frequency
                      </label>
                      <select
                        id="ev-rrule-freq"
                        value={form.rruleFreq}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rruleFreq: e.target
                              .value as EditorFormState["rruleFreq"],
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="ev-rrule-interval"
                        className="block text-xs font-semibold text-fg"
                      >
                        Interval
                      </label>
                      <input
                        id="ev-rrule-interval"
                        type="number"
                        min={1}
                        max={52}
                        value={form.rruleInterval}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rruleInterval: Number(e.target.value) || 1,
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ev-rrule-count"
                        className="block text-xs font-semibold text-fg"
                      >
                        Occurrences Count
                      </label>
                      <input
                        id="ev-rrule-count"
                        type="number"
                        min={1}
                        max={100}
                        value={form.rruleCount}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rruleCount: e.target.value,
                          }))
                        }
                        placeholder="e.g. 6"
                        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ev-rrule-until"
                        className="block text-xs font-semibold text-fg"
                      >
                        Or Until Date
                      </label>
                      <input
                        id="ev-rrule-until"
                        type="date"
                        value={form.rruleUntil}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rruleUntil: e.target.value,
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label
                        htmlFor="ev-exdates"
                        className="block text-xs font-semibold text-fg"
                      >
                        Excluded Dates (EXDATE, comma-separated YYYY-MM-DD)
                      </label>
                      <input
                        id="ev-exdates"
                        type="text"
                        value={form.exdatesText}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            exdatesText: e.target.value,
                          }))
                        }
                        placeholder="e.g. 2027-01-10, 2027-02-10"
                        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-fg"
                      />
                    </div>
                  </div>
                )}
              </fieldset>

              {/* Mode, Venue, Access */}
              <fieldset className="rounded-xl border border-border bg-bg p-4">
                <legend className="px-2 text-xs font-semibold text-primary uppercase">
                  Location, Mode &amp; Access
                </legend>
                <div className="mt-2 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="ev-mode"
                      className="block text-xs font-semibold text-fg"
                    >
                      Attendance Mode
                    </label>
                    <select
                      id="ev-mode"
                      value={form.mode}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mode: e.target.value as EventMode,
                        }))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    >
                      {EVENT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {MODE_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ev-access"
                      className="block text-xs font-semibold text-fg"
                    >
                      Access
                    </label>
                    <select
                      id="ev-access"
                      value={form.access}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          access: e.target.value as EventAccess,
                        }))
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    >
                      {EVENT_ACCESS_TYPES.map((a) => (
                        <option key={a} value={a}>
                          {ACCESS_LABELS[a]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ev-city"
                      className="block text-xs font-semibold text-fg"
                    >
                      City
                    </label>
                    <input
                      id="ev-city"
                      type="text"
                      value={form.venueCity}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, venueCity: e.target.value }))
                      }
                      placeholder="Hyderabad, New Delhi..."
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="ev-venue-name"
                      className="block text-xs font-semibold text-fg"
                    >
                      Venue Name
                    </label>
                    <input
                      id="ev-venue-name"
                      type="text"
                      value={form.venueName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, venueName: e.target.value }))
                      }
                      placeholder="e.g., KRB Auditorium, IIIT Hyderabad"
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ev-map-url"
                      className="block text-xs font-semibold text-fg"
                    >
                      Map URL (https://)
                    </label>
                    <input
                      id="ev-map-url"
                      type="url"
                      value={form.venueMapUrl}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          venueMapUrl: e.target.value,
                        }))
                      }
                      placeholder="https://maps.google.com/..."
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    />
                  </div>

                  {(form.mode === "online" || form.mode === "hybrid") && (
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="ev-online-url"
                        className="block text-xs font-semibold text-fg"
                      >
                        Online Session URL (https://)
                      </label>
                      <input
                        id="ev-online-url"
                        type="url"
                        value={form.onlineUrl}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            onlineUrl: e.target.value,
                          }))
                        }
                        placeholder="https://..."
                        className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                      />
                    </div>
                  )}
                </div>
              </fieldset>

              {/* Field-Level Pending Flags (Section 3 & C4) */}
              <fieldset className="rounded-xl border-2 border-dashed border-accent/60 bg-accent/5 p-4">
                <legend className="px-2 text-xs font-semibold text-accent uppercase">
                  Field-Level Pending Flags (&ldquo;To be confirmed&rdquo;)
                </legend>
                <p className="text-xs text-muted">
                  Check any field whose exact value is still being confirmed. When
                  published with pending fields, the event displays in the
                  pencilled-in <strong>Tentative</strong> style.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PENDING_FIELD_OPTIONS.map((opt) => {
                    const checked = form.pendingFields.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className="inline-flex items-center gap-2 text-xs font-medium text-fg"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setForm((prev) => ({
                              ...prev,
                              pendingFields: isChecked
                                ? [...prev.pendingFields, opt.id]
                                : prev.pendingFields.filter((f) => f !== opt.id),
                            }));
                          }}
                          className="size-4 accent-accent"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Domains, Series (EKSAQ), Partners */}
              <fieldset className="rounded-xl border border-border bg-bg p-4">
                <legend className="px-2 text-xs font-semibold text-primary uppercase">
                  Domains (Fixed 4 per C8), Series &amp; Partners
                </legend>
                <div className="mt-2">
                  <span className="block text-xs font-semibold text-fg">
                    Research Domains
                  </span>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {EVENT_DOMAINS.map((dom) => {
                      const checked = form.domains.includes(dom);
                      return (
                        <label
                          key={dom}
                          className="inline-flex items-center gap-2 text-xs font-medium text-fg"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setForm((prev) => ({
                                ...prev,
                                domains: isChecked
                                  ? [...prev.domains, dom]
                                  : prev.domains.filter((d) => d !== dom),
                              }));
                            }}
                            className="size-4 accent-primary"
                          />
                          <span>{DOMAIN_LABELS[dom]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                      <input
                        type="checkbox"
                        checked={form.eksaqSeries}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            eksaqSeries: e.target.checked,
                          }))
                        }
                        className="size-4 accent-primary"
                      />
                      <span>
                        Part of CETLS x EKSAQ Partnership Series (eksaq-partnership)
                      </span>
                    </label>
                  </div>

                  <div>
                    <label
                      htmlFor="ev-partners"
                      className="block text-xs font-semibold text-fg"
                    >
                      Partners (comma-separated)
                    </label>
                    <input
                      id="ev-partners"
                      type="text"
                      value={form.partnersText}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          partnersText: e.target.value,
                        }))
                      }
                      placeholder="e.g., EKSAQ"
                      className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Image Upload (JPG/PNG/WebP <= 2MB, required alt text) */}
              <fieldset className="rounded-xl border border-border bg-bg p-4">
                <legend className="px-2 text-xs font-semibold text-primary uppercase">
                  Event Image (JPG, PNG, WebP up to 2 MB · Alt Text Required)
                </legend>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="ev-image-alt"
                      className="block text-xs font-semibold text-fg"
                    >
                      Image Alt Text (required if image is set)
                    </label>
                    <input
                      id="ev-image-alt"
                      type="text"
                      value={form.imageAlt}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, imageAlt: e.target.value }))
                      }
                      placeholder="Describe the image for screen reader users"
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ev-image-file"
                      className="block text-xs font-semibold text-fg"
                    >
                      Upload Image File (auto-resized &le; 2 MB)
                    </label>
                    <label
                      htmlFor="ev-image-file"
                      className="mt-1 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-primary bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
                    >
                      <ImagePlus className="size-4" aria-hidden="true" />
                      <span>Select JPG / PNG / WebP</span>
                      <input
                        id="ev-image-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => void handleImageFileChange(e)}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="ev-image-url"
                      className="block text-xs font-semibold text-fg"
                    >
                      Image URL (populated on upload or enter https:// URL)
                    </label>
                    <input
                      id="ev-image-url"
                      type="text"
                      value={form.imageUrl}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
                      className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-fg"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Save / Submit Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("events")}
                  className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-4 py-2.5 text-xs font-semibold text-fg"
                >
                  Cancel
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary bg-surface px-5 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5"
                  >
                    <span>{busy ? "Saving…" : "Save as Draft"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) =>
                      void handleSaveEvent(
                        e as unknown as FormEvent<HTMLFormElement>,
                        true,
                      )
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
                  >
                    <Send className="size-4" aria-hidden="true" />
                    <span>Save &amp; Submit for Approval</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* TAB 3: IMMUTABLE AUDIT LOG (Admin Only) */}
        {activeTab === "audit" && isAdmin && (
          <section className="mt-6" aria-label="Immutable audit log">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  Immutable Audit Log
                </h2>
                <p className="text-xs text-muted">
                  Records every event creation, edit, submission, approval,
                  cancellation, and deletion with user, timestamp, and field-level
                  before/after diff. Entries cannot be modified or deleted.
                </p>
              </div>

              <div>
                <label
                  htmlFor="audit-event-select"
                  className="mr-2 text-xs font-semibold text-fg"
                >
                  Filter by Event:
                </label>
                <select
                  id="audit-event-select"
                  value={auditFilterEventId}
                  onChange={(e) => void handleFilterAudit(e.target.value)}
                  className="min-h-10 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg"
                >
                  <option value="">All events</option>
                  {dashboard.events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {dashboard.auditLogs.map((log) => {
                const diffKeys = Object.keys(log.diff ?? {});
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border bg-surface p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary uppercase">
                          {log.action}
                        </span>
                        <span className="font-semibold text-fg">
                          {log.eventSlug}
                        </span>
                        <span className="text-muted">by</span>
                        <span className="font-mono font-medium text-fg">
                          {log.actorEmail}
                        </span>
                      </div>
                      <time className="font-mono text-muted">
                        {log.createdAt}
                      </time>
                    </div>

                    {diffKeys.length > 0 ? (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-border text-muted">
                              <th scope="col" className="py-1 pr-3 font-semibold">
                                Field
                              </th>
                              <th scope="col" className="py-1 pr-3 font-semibold">
                                Before
                              </th>
                              <th scope="col" className="py-1 font-semibold">
                                After
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {diffKeys.map((field) => {
                              const change = log.diff[field];
                              return (
                                <tr
                                  key={field}
                                  className="border-b border-border/50 last:border-b-0"
                                >
                                  <td className="py-1.5 pr-3 font-mono font-semibold text-fg">
                                    {field}
                                  </td>
                                  <td className="py-1.5 pr-3 font-mono text-muted">
                                    {JSON.stringify(change?.before)}
                                  </td>
                                  <td className="py-1.5 font-mono text-primary">
                                    {JSON.stringify(change?.after)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-2 text-muted">No field diff recorded.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 4: ALLOWLIST USERS & ROLES (Admin Only) */}
        {activeTab === "users" && isAdmin && (
          <section className="mt-6 grid gap-6 lg:grid-cols-2" aria-label="Manage allowlist users">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-display text-xl font-semibold">
                Allowlisted Users ({dashboard.users.length})
              </h2>
              <p className="mt-1 text-xs text-muted">
                Only emails listed here can access <code className="font-mono">/admin</code>.
              </p>

              <div className="mt-4 divide-y divide-border">
                {dashboard.users.map((u) => (
                  <div
                    key={u.email}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-fg">{u.name}</p>
                      <p className="font-mono text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase",
                          u.role === "admin"
                            ? "bg-primary/15 text-primary"
                            : "bg-soft text-fg",
                        )}
                      >
                        {u.role}
                      </span>
                      {u.email.toLowerCase() !== actor.email.toLowerCase() && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveUser(u.email)}
                          disabled={busy}
                          className="min-h-9 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted hover:border-accent hover:text-accent"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-display text-xl font-semibold">
                Add or Update Allowlisted User
              </h2>
              <form onSubmit={handleAddUser} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="allowlist-email"
                    className="block text-xs font-semibold text-fg"
                  >
                    Institutional Email
                  </label>
                  <input
                    id="allowlist-email"
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="colleague@iiit.ac.in"
                    className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-fg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="allowlist-name"
                    className="block text-xs font-semibold text-fg"
                  >
                    Full Name
                  </label>
                  <input
                    id="allowlist-name"
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Faculty or Staff Name"
                    className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-fg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="allowlist-role"
                    className="block text-xs font-semibold text-fg"
                  >
                    Role
                  </label>
                  <select
                    id="allowlist-role"
                    value={newUserRole}
                    onChange={(e) =>
                      setNewUserRole(e.target.value as EventUserRole)
                    }
                    className="mt-1 min-h-11 w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-fg"
                  >
                    <option value="editor">
                      Editor (create, edit, duplicate, submit for approval)
                    </option>
                    <option value="admin">
                      Admin (approve &amp; publish, cancel, delete, manage users, view
                      audit log)
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover"
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  <span>Save to Allowlist</span>
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </SiteShell>
  );
}
