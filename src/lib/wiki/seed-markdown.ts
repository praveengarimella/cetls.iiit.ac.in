import {
  data,
  formatIsoDate,
  formatOrder,
  getDomain,
  getDomains,
  getGroup,
  getPage,
  getPerson,
  getResearchQuestions,
  getRoadmapPhases,
  publishedGroups,
  publishedMembers,
  publishedNews,
  t,
  type PublishedGroupMember,
} from "@/lib/site-data";
import type { RoadmapProgress } from "@/lib/site-data.types";

export interface SeedWikiPage {
  slug: string;
  path: string;
  title: string;
  markdown: string;
}

const PROGRESS_LABEL: Record<RoadmapProgress, string> = {
  done: "Completed",
  "in-progress": "In Progress",
  planned: "Planned",
};

function buildHomeMarkdown(): string {
  const inauguralPath = getPage("inaugural").path;
  const platformPath = getPage("platform").path;
  const joinTarget = getPage(data.join.homeTeaser.pageId).path;
  const ctas = data.org.hero.ctas
    .map((cta) => {
      const target = getPage(cta.pageId).path;
      const cls =
        cta.variant === "primary"
          ? "{.btn-primary}"
          : cta.variant === "secondary"
            ? "{.btn-secondary}"
            : "";
      return `[${t(cta.label)}](${target})${cls}`;
    })
    .join("  ");

  return [
    "---",
    `eyebrow: ${t(data.org.hero.eyebrow)}`,
    `lead: ${t(data.org.hero.summary)}`,
    "layout: home",
    "---",
    "",
    `# ${t(data.org.hero.headline)}`,
    "",
    ctas,
    "",
    `:::card ${t(data.inaugural.title)} | ${t(data.inaugural.subtitle)} · ${formatIsoDate(data.inaugural.date)}`,
    t(data.inaugural.lead),
    "",
    `[${t(data.news.items[0]?.ctaLabel || "Read Report")} →](${inauguralPath})`,
    ":::",
    "",
    "{{upcoming-events}}",
    "",
    `## ${t(data.research.homeHeading)}`,
    "",
    t(data.research.homeIntro),
    "",
    "{{domains-grid}}",
    "",
    `:::hero-banner ${t(data.platform.name)} | ${t(data.platform.homeEyebrow)}`,
    t(data.platform.summary),
    "",
    `[${t(data.platform.homeCtaLabel)}](${platformPath}){.btn-light}`,
    ":::",
    "",
    "{{chief-mentor}}",
    "",
    "{{advisory-strip}}",
    "",
    "{{programmes}}",
    "",
    ":::callout",
    `### ${t(data.join.homeTeaser.heading)}`,
    "",
    t(data.join.homeTeaser.body),
    "",
    `[${t(data.join.homeTeaser.ctaLabel)}](${joinTarget}){.btn-primary}`,
    ":::",
  ].join("\n");
}

function buildAboutMarkdown(): string {
  const aboutPage = getPage("about");
  const advisoryPath = getPage("advisory").path;
  const inauguralPath = getPage("inaugural").path;
  const advisoryGroup = getGroup("advisory");
  const questions = getResearchQuestions();
  const phases = getRoadmapPhases();

  const lines: string[] = [
    `# ${t(aboutPage.title)}`,
    "",
    `## ${t(data.org.vision.heading)}`,
    "",
    t(data.org.vision.value),
    "",
    `## ${t(data.org.mission.heading)}`,
    "",
    t(data.org.mission.value),
    "",
    `## ${t(data.org.approach.heading)}`,
    "",
    t(data.org.approach.intro),
    "",
    ...questions.map((q) => `- ${t(q.label)}`),
    "",
    t(data.org.approach.outro),
    "",
    `## ${t(data.org.whyIiith.heading)}`,
    "",
    t(data.org.whyIiith.value),
    "",
    `## ${t(advisoryGroup.name)}`,
    "",
    `${t(advisoryGroup.summary)} {{advisory-inline}}`,
    "",
    ...(advisoryGroup.homeCtaLabel
      ? [`[${t(advisoryGroup.homeCtaLabel)}](${advisoryPath})`, ""]
      : []),
    `## ${t(data.roadmap.heading)}`,
    "",
    t(data.roadmap.intro),
    "",
  ];

  for (const phase of phases) {
    lines.push(`:::card ${t(phase.title)} | ${PROGRESS_LABEL[phase.progress]}`);
    lines.push(t(phase.body));
    if (phase.id === "phase-1" && data.news.items[0]?.ctaLabel) {
      lines.push("");
      lines.push(`[${t(data.news.items[0].ctaLabel)} →](${inauguralPath})`);
    }
    lines.push(":::");
    lines.push("");
  }

  lines.push("{{programmes}}");
  return lines.join("\n");
}

function buildResearchIndexMarkdown(): string {
  const platformPath = getPage("platform").path;
  return [
    "---",
    `lead: ${t(data.research.pageIntro)}`,
    "layout: wide",
    "---",
    "",
    `# ${t(data.research.pageHeading)}`,
    "",
    "{{domains-grid}}",
    "",
    `## ${t(data.research.crossCutting.heading)}`,
    "",
    t(data.research.crossCutting.intro),
    "",
    ...data.research.crossCutting.items.map((item) => `- ${t(item)}`),
    "",
    `${t(data.research.crossCutting.outroPrefix)} [${t(data.platform.name)}](${platformPath})${t(data.research.crossCutting.outroSuffix)}`,
  ].join("\n");
}

function buildDomainPillarMarkdown(domainId: string): string {
  const domain = getDomain(domainId);
  const researchPage = getPage("research");
  const platformPage = getPage("platform");

  const lines: string[] = [
    "---",
    `eyebrow: ${formatOrder(domain.order)}`,
    `lead: ${t(domain.summary)}`,
    `backLabel: ${t(researchPage.title)}`,
    `backLink: ${researchPage.path}`,
    "---",
    "",
    `# ${t(domain.title)}`,
    "",
    ...domain.context.flatMap((para) => [t(para), ""]),
  ];

  for (const q of domain.questions) {
    lines.push(`## ${t(q.heading)}`);
    lines.push("");
    lines.push(t(q.body));
    lines.push("");
  }

  lines.push(":::card Supported by");
  lines.push(`[${t(data.platform.name)} →](${platformPage.path})`);
  lines.push(":::");
  return lines.join("\n");
}

function buildPlatformMarkdown(): string {
  const ctaPath = getPage(data.platform.cta.pageId).path;
  const [firstPara, ...restParas] = data.platform.description;
  const linkParts: string[] = [];
  if (data.platform.repoUrl) linkParts.push(`[Source code →](${data.platform.repoUrl})`);
  if (data.platform.docsUrl) linkParts.push(`[Documentation →](${data.platform.docsUrl})`);
  if (data.platform.license) linkParts.push(`Licence: ${t(data.platform.license)}`);

  return [
    "---",
    `eyebrow: ${t(data.platform.eyebrow)}`,
    ...(firstPara ? [`lead: ${t(firstPara)}`] : []),
    "---",
    "",
    `# ${t(data.platform.name)}`,
    "",
    ...restParas.flatMap((p) => [t(p), ""]),
    `## ${t(data.platform.audiencesHeading)}`,
    "",
    ...data.platform.audiences.map((aud) => `- ${t(aud)}`),
    "",
    `## ${t(data.platform.statusHeading)}`,
    "",
    t(data.platform.statusText),
    ...(linkParts.length > 0 ? ["", linkParts.join("  ·  ")] : []),
    "",
    `:::card ${t(data.platform.cta.heading)}`,
    t(data.platform.cta.body),
    "",
    `[${t(data.platform.cta.label)}](${ctaPath})`,
    ":::",
  ].join("\n");
}

function buildNewsMarkdown(): string {
  const items = publishedNews();
  const lines: string[] = [
    "---",
    `lead: ${t(data.news.intro)}`,
    "---",
    "",
    `# ${t(data.news.heading)}`,
    "",
  ];

  for (const n of items) {
    const targetPath = n.pageId ? getPage(n.pageId).path : null;
    const meta = [formatIsoDate(n.date), n.venue ? t(n.venue) : null]
      .filter(Boolean)
      .join(" · ");
    lines.push(`:::card ${t(n.title)} | ${meta}`);
    lines.push(t(n.body));
    const links: string[] = [];
    if (targetPath && n.ctaLabel) {
      links.push(`[${t(n.ctaLabel)} →](${targetPath})`);
    }
    if (n.externalUrl && n.externalLabel) {
      links.push(`[${t(n.externalLabel)} ↗](${n.externalUrl})`);
    }
    if (links.length > 0) {
      lines.push("");
      lines.push(links.join("  ·  "));
    }
    lines.push(":::");
    lines.push("");
  }

  return lines.join("\n");
}

function buildJoinMarkdown(): string {
  const contactPath = getPage(data.join.outro.pageId).path;
  const lines: string[] = [
    "---",
    `lead: ${t(data.join.intro)}`,
    "---",
    "",
    `# ${t(data.join.heading)}`,
    "",
  ];

  for (const p of data.join.pathways) {
    lines.push(`:::card ${t(p.title)}`);
    lines.push(t(p.body));
    lines.push(":::");
    lines.push("");
  }

  lines.push(
    `${t(data.join.outro.prefix)} [${t(data.join.outro.linkLabel)}](${contactPath})${t(data.join.outro.suffix)}`,
  );
  return lines.join("\n");
}

function buildInauguralMarkdown(): string {
  const { inaugural } = data;
  const advisoryPath = getPage("advisory").path;
  const joinPath = getPage("join").path;
  const contactPath = getPage("contact").path;
  const signatories = inaugural.signOff.signatories.map((id) => getPerson(id).name);

  const lines: string[] = [
    "---",
    `eyebrow: ${t(inaugural.eyebrow)}`,
    `subtitle: ${t(inaugural.subtitle)} · ${formatIsoDate(inaugural.date)}`,
    `lead: ${t(inaugural.lead)}`,
    "layout: wide-article",
    "---",
    "",
    `# ${t(inaugural.title)}`,
    "",
  ];

  for (const photo of inaugural.gallery) {
    lines.push(`![${t(photo.alt)}](${photo.src}${photo.caption ? ` "${t(photo.caption)}"` : ""})`);
    lines.push("");
  }

  lines.push(`## ${t(inaugural.background.heading)}`);
  lines.push("");
  for (const para of inaugural.background.paragraphs) {
    lines.push(t(para));
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`## ${t(inaugural.event.heading)}`);
  lines.push("");
  lines.push(
    `${t(inaugural.event.pressCoverage.prefix)}[${t(inaugural.event.pressCoverage.label)} ↗](${inaugural.event.pressCoverage.url})${t(inaugural.event.pressCoverage.suffix)}`,
  );
  lines.push("");
  for (const para of inaugural.event.paragraphs) {
    lines.push(t(para));
    lines.push("");
  }

  lines.push(`:::card ${t(inaugural.event.questionsIntro)}`);
  inaugural.event.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${t(q)}`);
  });
  lines.push(":::");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(`## ${t(inaugural.programmeAreas.heading)}`);
  lines.push("");
  lines.push(t(inaugural.programmeAreas.intro));
  lines.push("");

  for (const area of inaugural.programmeAreas.items) {
    const domain = getDomain(area.domainId);
    lines.push(`:::card ${t(area.title)}`);
    lines.push(t(area.body));
    lines.push("");
    lines.push(`[${t(domain.title)} →](${domain.path})`);
    lines.push(":::");
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`## ${t(inaugural.advisersAndSupport.heading)}`);
  lines.push("");
  lines.push(t(inaugural.advisersAndSupport.advisersIntro));
  lines.push("");
  for (const adv of inaugural.advisersAndSupport.advisers) {
    lines.push(
      `- **[${t(adv.name)}](${advisoryPath}#${adv.personId})**, ${t(adv.affiliation)}: **${t(adv.focus)}**`,
    );
  }
  lines.push("");
  lines.push(t(inaugural.advisersAndSupport.supportBody));
  lines.push("");

  lines.push(":::callout");
  lines.push(`### ${t(inaugural.collaboratorsSought.heading)}`);
  lines.push("");
  lines.push(t(inaugural.collaboratorsSought.body));
  lines.push("");
  lines.push(
    `[${t(getPage("join").title)} →](${joinPath}){.btn-primary}  [${t(getPage("contact").title)}](${contactPath}){.btn-secondary}`,
  );
  lines.push(":::");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`**${signatories.join(" and ")}**`);
  lines.push("");
  lines.push(t(inaugural.signOff.organizationLine));

  return lines.join("\n");
}

function formatPersonBlock(
  member: PublishedGroupMember,
  mode: "group" | "advisory",
): string[] {
  const { person, roleTitle, roleLines } = member;
  const lines: string[] = [`:::person ${person.name}`];
  lines.push(`id: ${person.id}`);
  if (person.photo) {
    lines.push(`photo: ${person.photo}`);
  }

  if (mode === "advisory") {
    if (person.headline) {
      lines.push(`role: ${t(person.headline)}`);
    }
    for (const sub of person.subtitleLines) {
      lines.push(`subtitle: ${t(sub)}`);
    }
  } else {
    const displayRoles = roleLines.length > 0 ? roleLines : [roleTitle];
    for (const r of displayRoles) {
      if (r) lines.push(`role: ${t(r)}`);
    }
    if (person.subtitleLines.length > 0 && displayRoles.length === 1) {
      for (const sub of person.subtitleLines) {
        lines.push(`subtitle: ${t(sub)}`);
      }
    }
    if (person.email) {
      lines.push(`email: ${person.email}`);
    }
  }

  const bodyParts: string[] = [];
  if (person.bio) {
    bodyParts.push(t(person.bio));
  }
  const linkMarkdown = person.links
    .filter((l) => Boolean(l.url))
    .map((l) => `[${t(l.label)}](${l.url})`);
  if (linkMarkdown.length > 0) {
    bodyParts.push(linkMarkdown.join("  ·  "));
  }

  if (bodyParts.length > 0) {
    lines.push("");
    lines.push(bodyParts.join("\n\n"));
  }
  lines.push(":::");
  return lines;
}

function buildPeopleMarkdown(): string {
  const peoplePage = getPage("people");
  const groups = publishedGroups();
  const lines: string[] = [
    "---",
    "layout: directory",
    "---",
    "",
    `# ${t(peoplePage.title)}`,
    "",
  ];

  for (const group of groups) {
    lines.push(`## ${t(group.name)}`);
    lines.push("");
    if (group.peopleIntro) {
      lines.push(t(group.peopleIntro));
      lines.push("");
    }
    const mode = group.id === "advisory" ? "advisory" : "group";
    for (const member of group.publishedMembers) {
      lines.push(...formatPersonBlock(member, mode));
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildAdvisoryMarkdown(): string {
  const peoplePage = getPage("people");
  const advisoryGroup = getGroup("advisory");
  const members = publishedMembers("advisory");
  const lines: string[] = [
    "---",
    `eyebrow: ${t(peoplePage.title)}`,
    ...(advisoryGroup.description ? [`lead: ${t(advisoryGroup.description)}`] : []),
    "layout: directory",
    "---",
    "",
    `# ${t(advisoryGroup.name)}`,
    "",
  ];

  for (const member of members) {
    lines.push(...formatPersonBlock(member, "advisory"));
    lines.push("");
  }

  return lines.join("\n");
}

function buildContactMarkdown(): string {
  return [
    "---",
    `lead: ${t(data.contact.intro)}`,
    "---",
    "",
    `# ${t(data.contact.heading)}`,
    "",
    "{{contact-directory}}",
    "",
    ...(data.contact.websiteNote ? [t(data.contact.websiteNote), ""] : []),
    "{{contact-form}}",
  ].join("\n");
}

export function getBuiltInSeedWikiPages(): SeedWikiPage[] {
  const domainSeeds = getDomains().map((d) => ({
    slug: `research-${d.id}`,
    path: d.path,
    title: t(d.title),
    markdown: buildDomainPillarMarkdown(d.id),
  }));

  return [
    {
      slug: "home",
      path: "/",
      title: `${t(data.org.shortName)} — Home`,
      markdown: buildHomeMarkdown(),
    },
    {
      slug: "about",
      path: "/about",
      title: t(getPage("about").title),
      markdown: buildAboutMarkdown(),
    },
    {
      slug: "research",
      path: "/research",
      title: t(data.research.pageHeading),
      markdown: buildResearchIndexMarkdown(),
    },
    ...domainSeeds,
    {
      slug: "platform",
      path: "/platform",
      title: t(data.platform.name),
      markdown: buildPlatformMarkdown(),
    },
    {
      slug: "people",
      path: "/people",
      title: t(getPage("people").title),
      markdown: buildPeopleMarkdown(),
    },
    {
      slug: "advisory",
      path: "/advisory",
      title: t(getGroup("advisory").name),
      markdown: buildAdvisoryMarkdown(),
    },
    {
      slug: "news",
      path: "/news",
      title: t(data.news.heading),
      markdown: buildNewsMarkdown(),
    },
    {
      slug: "join",
      path: "/join",
      title: t(data.join.heading),
      markdown: buildJoinMarkdown(),
    },
    {
      slug: "inaugural",
      path: "/inaugural",
      title: t(data.inaugural.title),
      markdown: buildInauguralMarkdown(),
    },
    {
      slug: "contact",
      path: "/contact",
      title: t(data.contact.heading),
      markdown: buildContactMarkdown(),
    },
  ];
}

export function getSeedWikiPageBySlug(slug: string): SeedWikiPage | null {
  return getBuiltInSeedWikiPages().find((p) => p.slug === slug) ?? null;
}
