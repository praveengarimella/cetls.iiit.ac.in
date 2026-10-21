import raw from "../../data/site-data.json";
import type {
  Domain,
  Group,
  GroupMember,
  NewsItem,
  PageConfig,
  Person,
  ProgrammeItem,
  ProjectItem,
  ResearchQuestion,
  RoadmapPhase,
  SiteData,
} from "./site-data.types";

export const data = raw as unknown as SiteData;

const tokens: Record<string, string> = {
  "org.name": data.org.name.value,
  "org.shortName": data.org.shortName,
  "parent.name": data.org.parent.name,
  "parent.shortName": data.org.parent.shortName,
  "parent.abbreviation": data.org.parent.abbreviation,
  year: String(new Date().getFullYear()),
};

export function resolveTokens(s?: string | null): string {
  if (!s) return "";
  return s.replace(/\{([a-zA-Z.]+)\}/g, (_, k: string) => tokens[k] ?? `{${k}}`);
}

export const t = resolveTokens;

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

const peopleById = byId(data.people);
const groupsById = byId(data.groups);
const domainsById = byId(data.domains);
const pagesById = byId(data.pages);
const questionsById = byId(data.researchQuestions);

export function getPerson(id: string): Person {
  const p = peopleById.get(id);
  if (!p) {
    throw new Error(`Unknown personId: ${id}`);
  }
  return p;
}

export function getGroup(id: string): Group {
  const g = groupsById.get(id);
  if (!g) {
    throw new Error(`Unknown groupId: ${id}`);
  }
  return g;
}

export type PublishedGroupMember = GroupMember & { person: Person };

export function publishedMembers(groupId: string): PublishedGroupMember[] {
  return getGroup(groupId)
    .members.filter((m) => m.published && getPerson(m.personId).published)
    .map((m) => ({ ...m, person: getPerson(m.personId) }));
}

export function publishedGroups(): Array<Group & { publishedMembers: PublishedGroupMember[] }> {
  return [...data.groups]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      ...group,
      publishedMembers: publishedMembers(group.id),
    }))
    .filter((group) => group.publishedMembers.length > 0);
}

export function getDomain(id: string): Domain {
  const d = domainsById.get(id);
  if (!d) {
    throw new Error(`Unknown domainId: ${id}`);
  }
  return d;
}

export function getDomains(): Domain[] {
  return [...data.domains].sort((a, b) => a.order - b.order);
}

export function formatOrder(order: number): string {
  return String(order).padStart(2, "0");
}

export function getResearchQuestion(id: string): ResearchQuestion {
  const q = questionsById.get(id);
  if (!q) {
    throw new Error(`Unknown questionId: ${id}`);
  }
  return q;
}

export function getResearchQuestions(): ResearchQuestion[] {
  return [...data.researchQuestions].sort((a, b) => a.order - b.order);
}

export function getRoadmapPhases(): RoadmapPhase[] {
  return [...data.roadmap.phases].sort((a, b) => a.order - b.order);
}

export function publishedProgrammes(): ProgrammeItem[] {
  return data.programmes.items.filter((item) => item.published);
}

export function publishedProjects(): ProjectItem[] {
  return data.projects.items.filter((item) => item.published && item.visibility === "public");
}

export function publishedNews(): NewsItem[] {
  return [...data.news.items]
    .filter((item) => item.published)
    .sort((a, b) => b.date.localeCompare(a.date));
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatIsoDate(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (!year || monthIdx < 0 || monthIdx > 11 || !day) return isoDate;
  return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
}

export function getPage(id: string): PageConfig {
  const p = pagesById.get(id);
  if (!p) {
    throw new Error(`Unknown pageId: ${id}`);
  }
  return p;
}

/**
 * Resolve a dotted reference such as "domains[k12].summary" or "org.mission.value".
 */
export function resolveRef(ref: string): string {
  const parts = ref.split(".");
  let cur: unknown = data;
  for (const part of parts) {
    const bracketMatch = /^([a-zA-Z0-9_]+)\[([a-z0-9-]+)\]$/.exec(part);
    if (bracketMatch) {
      const [, key, id] = bracketMatch;
      if (!cur || typeof cur !== "object" || !(key in cur)) {
        throw new Error(`Invalid ref segment '${part}' in '${ref}'`);
      }
      const list = (cur as Record<string, unknown>)[key];
      if (!Array.isArray(list)) {
        throw new Error(`Ref segment '${key}' is not an array in '${ref}'`);
      }
      const found = list.find(
        (item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object" && "id" in item && item.id === id),
      );
      if (!found) {
        throw new Error(`Unknown id '${id}' in ref '${ref}'`);
      }
      cur = found;
    } else {
      if (!cur || typeof cur !== "object" || !(part in cur)) {
        throw new Error(`Invalid ref property '${part}' in '${ref}'`);
      }
      cur = (cur as Record<string, unknown>)[part];
    }
  }
  if (typeof cur !== "string") {
    throw new Error(`Ref '${ref}' did not resolve to a string`);
  }
  return t(cur);
}
