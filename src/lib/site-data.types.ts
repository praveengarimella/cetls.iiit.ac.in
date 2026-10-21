export type DataStatus = "confirmed" | "pending-praveen";

export type FieldStatusMap = Record<string, DataStatus>;

export interface SiteMeta {
  schemaVersion: string;
  extractedAt: string;
  statusValues: {
    confirmed: string;
    "pending-praveen": string;
  };
  tokens: string[];
}

export interface SiteAssetImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface SiteAssets {
  logo: { src: string; alt: string };
  logoMark: { src: string; alt: string; width: number; height: number };
  favicon: string;
  appleTouchIcon: string | null;
  manifest: string;
  ogImage: { src: string; width: number; height: number; alt: string };
  fieldStatus?: FieldStatusMap;
}

export interface NavItem {
  pageId: string;
  label: string;
}

export interface FooterGroup {
  title: string;
  links: NavItem[];
}

export interface SocialProfile {
  id: string;
  label: string;
  url: string;
  published: boolean;
}

export interface SiteConfig {
  baseUrl: string;
  themeColor: string;
  backgroundColor: string;
  twitterCard: "summary" | "summary_large_image";
  homeTitle: string;
  titleTemplate: string;
  fonts: {
    preconnectUrls: string[];
    stylesheetUrl: string;
  };
  assets: SiteAssets;
  nav: NavItem[];
  footer: {
    taglineLines: string[];
    groups: FooterGroup[];
    copyright: string;
  };
  social: {
    profiles: SocialProfile[];
    fieldStatus?: FieldStatusMap;
  };
  robots: {
    allow: string[];
    disallow: string[];
  };
}

export interface HeroCta {
  pageId: string;
  label: string;
  variant: "primary" | "secondary" | "link";
}

export interface OrgConfig {
  shortName: string;
  name: {
    value: string;
    alternatives: string[];
    status: DataStatus;
  };
  parent: {
    name: string;
    displayName: string;
    shortName: string;
    abbreviation: string;
    url: string | null;
    fieldStatus?: FieldStatusMap;
  };
  address: {
    street: string | null;
    locality: string;
    city: string;
    postalCode: string;
    region: string;
    country: string;
    fieldStatus?: FieldStatusMap;
  };
  metaDescription: string;
  hero: {
    eyebrow: string;
    headline: string;
    summary: string;
    ctas: HeroCta[];
  };
  vision: {
    heading: string;
    value: string;
    alternatives: string[];
    status: DataStatus;
  };
  mission: {
    heading: string;
    value: string;
    status: DataStatus;
  };
  approach: {
    heading: string;
    intro: string;
    outro: string;
  };
  whyIiith: {
    heading: string;
    value: string;
  };
}

export interface ResearchQuestion {
  id: string;
  order: number;
  label: string;
}

export interface ResearchConfig {
  homeHeading: string;
  homeIntro: string;
  pageHeading: string;
  pageIntro: string;
  crossCutting: {
    heading: string;
    intro: string;
    items: string[];
    outroPrefix: string;
    outroSuffix: string;
  };
}

export interface DomainQuestion {
  questionId: string;
  heading: string;
  body: string;
}

export interface Domain {
  id: string;
  order: number;
  pageId: string;
  path: string;
  title: string;
  summary: string;
  context: string[];
  questions: DomainQuestion[];
}

export type RoadmapProgress = "done" | "in-progress" | "planned";

export interface RoadmapPhase {
  id: string;
  order: number;
  title: string;
  body: string;
  progress: RoadmapProgress;
  status: DataStatus;
  fieldStatus?: FieldStatusMap;
}

export interface RoadmapConfig {
  heading: string;
  intro: string;
  phases: RoadmapPhase[];
}

export interface PlatformConfig {
  eyebrow: string;
  homeEyebrow: string;
  name: string;
  summary: string;
  homeCtaLabel: string;
  description: string[];
  audiencesHeading: string;
  audiences: string[];
  statusHeading: string;
  statusText: string;
  repoUrl: string | null;
  docsUrl: string | null;
  license: string | null;
  fieldStatus?: FieldStatusMap;
  cta: {
    heading: string;
    body: string;
    pageId: string;
    label: string;
  };
}

export interface ProgrammeItem {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  domainId: string | null;
  status: DataStatus;
  published: boolean;
  fieldStatus?: FieldStatusMap;
}

export interface ProgrammesConfig {
  heading: string;
  summary: string;
  status: DataStatus;
  items: ProgrammeItem[];
}

export type ProjectStage = "proposed" | "active" | "pilot" | "completed" | "paused";
export type ProjectHealth = "on-track" | "at-risk" | "blocked";
export type ProjectVisibility = "internal" | "public";
export type ProjectUpdateType =
  | "progress"
  | "milestone"
  | "pilot"
  | "publication"
  | "blocker"
  | "decision";

export interface ProjectUpdateItem {
  id: string;
  date: string;
  authorPersonId: string;
  type: ProjectUpdateType;
  health: ProjectHealth;
  title: string;
  body: string;
  nextSteps: string | null;
  blockers: string | null;
  externalUrl: string | null;
  published: boolean;
}

export interface ProjectItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  status: DataStatus;
  published: boolean;
  visibility: ProjectVisibility;
  stage: ProjectStage;
  health: ProjectHealth;
  domainIds: string[];
  questionIds: string[];
  programmeId: string | null;
  usesMiddleware: boolean;
  leadPersonId: string;
  memberPersonIds: string[];
  startDate: string | null;
  targetDate: string | null;
  repoUrl: string | null;
  docUrl: string | null;
  fieldStatus?: FieldStatusMap;
  updates: ProjectUpdateItem[];
}

export interface ProjectsConfig {
  heading: string;
  intro: string;
  items: ProjectItem[];
}

export interface PersonLink {
  label: string;
  url: string;
}

export interface Person {
  id: string;
  legacyAnchor?: string | null;
  name: string;
  honorific: string | null;
  photo: string | null;
  headline: string | null;
  subtitleLines: string[];
  shortAffiliation: string | null;
  bioShort: string | null;
  bio: string | null;
  links: PersonLink[];
  email: string | null;
  status: DataStatus;
  published: boolean;
  fieldStatus?: FieldStatusMap;
}

export interface GroupMember {
  personId: string;
  roleTitle: string;
  roleLines: string[];
  status: DataStatus;
  published: boolean;
}

export interface Group {
  id: string;
  order: number;
  name: string;
  homeEyebrow: string | null;
  homeCtaLabel: string | null;
  summary: string | null;
  peopleIntro: string | null;
  description: string | null;
  fieldStatus?: FieldStatusMap;
  members: GroupMember[];
}

export interface JoinPathway {
  id: string;
  title: string;
  body: string;
}

export interface JoinConfig {
  heading: string;
  intro: string;
  homeTeaser: {
    heading: string;
    body: string;
    pageId: string;
    ctaLabel: string;
  };
  pathways: JoinPathway[];
  outro: {
    prefix: string;
    linkLabel: string;
    pageId: string;
    suffix: string;
  };
}

export interface NewsItem {
  id: string;
  date: string;
  title: string;
  venue: string | null;
  body: string;
  liveBody?: string | null;
  status: DataStatus;
  published: boolean;
}

export interface NewsConfig {
  heading: string;
  intro: string;
  items: NewsItem[];
}

export interface ContactPersonRef {
  personId: string;
  roleLabel: string;
  showHonorific: boolean;
}

export interface ContactFormField {
  name: string;
  label: string;
  type: "text" | "email" | "textarea";
  rows?: number;
  required: boolean;
}

export interface ContactConfig {
  heading: string;
  intro: string;
  email: string | null;
  websiteNote: string | null;
  fieldStatus?: FieldStatusMap;
  contacts: ContactPersonRef[];
  form: {
    endpoint: string;
    status: DataStatus;
    fields: ContactFormField[];
    submitLabel: string;
    submittingLabel: string;
    successHeading: string;
    successBody: string;
    resetLabel: string;
    errorFallback: string;
    networkError: string;
  };
}

export interface PageConfig {
  id: string;
  path: string;
  title: string;
  seo: {
    description: string | null;
    descriptionRef: string | null;
    ogTitle: string | null;
    ogImage: {
      src: string;
      width: number;
      height: number;
      alt: string;
    } | null;
    noindex: boolean;
    fieldStatus?: FieldStatusMap;
  };
  sections: string[];
}

export interface SiteData {
  meta: SiteMeta;
  site: SiteConfig;
  org: OrgConfig;
  researchQuestions: ResearchQuestion[];
  research: ResearchConfig;
  domains: Domain[];
  roadmap: RoadmapConfig;
  platform: PlatformConfig;
  programmes: ProgrammesConfig;
  projects: ProjectsConfig;
  people: Person[];
  groups: Group[];
  join: JoinConfig;
  news: NewsConfig;
  contact: ContactConfig;
  pages: PageConfig[];
}
