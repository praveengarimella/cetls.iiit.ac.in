import type { SiteData } from "@/lib/site-data.types";
import type { ContentDiffItem } from "./types";

function formatValue(val: unknown): string {
  if (val === undefined) return "(none)";
  if (val === null) return "null";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function sectionFromPath(path: string): string {
  const top = path.split(/[.[]/)[0] || "general";
  return top;
}

function walkDiff(
  before: unknown,
  after: unknown,
  path: string,
  out: ContentDiffItem[],
): void {
  if (Object.is(before, after)) return;

  if (before === undefined) {
    out.push({
      path,
      section: sectionFromPath(path),
      kind: "added",
      before: "(none)",
      after: formatValue(after),
    });
    return;
  }

  if (after === undefined) {
    out.push({
      path,
      section: sectionFromPath(path),
      kind: "removed",
      before: formatValue(before),
      after: "(none)",
    });
    return;
  }

  if (
    before === null ||
    after === null ||
    typeof before !== "object" ||
    typeof after !== "object"
  ) {
    out.push({
      path,
      section: sectionFromPath(path),
      kind: "changed",
      before: formatValue(before),
      after: formatValue(after),
    });
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const beforeHasIds = before.every(
      (item) => item && typeof item === "object" && "id" in item && typeof item.id === "string",
    );
    const afterHasIds = after.every(
      (item) => item && typeof item === "object" && "id" in item && typeof item.id === "string",
    );

    if (beforeHasIds && afterHasIds) {
      const bMap = new Map(
        before.map((item) => [(item as { id: string }).id, item]),
      );
      const aMap = new Map(
        after.map((item) => [(item as { id: string }).id, item]),
      );
      const allIds = new Set([...bMap.keys(), ...aMap.keys()]);
      for (const id of allIds) {
        walkDiff(bMap.get(id), aMap.get(id), `${path}[id=${id}]`, out);
      }
      return;
    }

    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i += 1) {
      walkDiff(before[i], after[i], `${path}[${i}]`, out);
    }
    return;
  }

  if (Array.isArray(before) !== Array.isArray(after)) {
    out.push({
      path,
      section: sectionFromPath(path),
      kind: "changed",
      before: formatValue(before),
      after: formatValue(after),
    });
    return;
  }

  const bObj = before as Record<string, unknown>;
  const aObj = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(bObj), ...Object.keys(aObj)]);
  for (const key of keys) {
    const nextPath = path ? `${path}.${key}` : key;
    walkDiff(bObj[key], aObj[key], nextPath, out);
  }
}

export function computeSiteDataDiff(
  before: SiteData,
  after: SiteData,
): ContentDiffItem[] {
  const out: ContentDiffItem[] = [];
  walkDiff(before, after, "", out);
  return out;
}
