#!/usr/bin/env python3
"""
CI validation script for data/site-data.json:
1. JSON Schema (Draft 2020-12) validation against data/site-data.schema.json
2. ID uniqueness and kebab-case enforcement across all entity collections
3. Referential integrity (personId, pageId, questionId, domainId, programmeId, descriptionRef)
4. --pending flag to list all open items with status/fieldStatus == "pending-praveen"
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "site-data.json"
SCHEMA_PATH = ROOT / "data" / "site-data.schema.json"
KEBAB_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def resolve_ref(data: dict, ref: str):
    """Resolve dotted/bracketed reference like 'domains[k12].summary' or 'org.mission.value'."""
    parts = ref.split(".")
    cur = data
    for part in parts:
        m = re.match(r"^([a-zA-Z0-9_]+)\[([a-z0-9-]+)\]$", part)
        if m:
            key, item_id = m.group(1), m.group(2)
            if not isinstance(cur, dict) or key not in cur or not isinstance(cur[key], list):
                return None
            found = next((x for x in cur[key] if isinstance(x, dict) and x.get("id") == item_id), None)
            if found is None:
                return None
            cur = found
        else:
            if not isinstance(cur, dict) or part not in cur:
                return None
            cur = cur[part]
    return cur


def collect_pending(obj, path="root"):
    """Recursively find all records and fields marked pending-praveen."""
    pending = []
    if isinstance(obj, dict):
        ident = f"[{obj['id']}]" if "id" in obj else (f"[{obj['personId']}]" if "personId" in obj else "")
        cur_path = f"{path}{ident}"
        if obj.get("status") == "pending-praveen":
            published = obj.get("published")
            pub_note = f" (published={published})" if published is not None else ""
            pending.append(f"{cur_path}.status = pending-praveen{pub_note}")
        field_status = obj.get("fieldStatus")
        if isinstance(field_status, dict):
            for k, v in field_status.items():
                if v == "pending-praveen":
                    pending.append(f"{cur_path}.fieldStatus.{k} = pending-praveen")
        for k, v in obj.items():
            if k in ("status", "fieldStatus", "statusValues"):
                continue
            pending.extend(collect_pending(v, f"{cur_path}.{k}"))
    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            if isinstance(item, dict) and ("id" in item or "personId" in item):
                pending.extend(collect_pending(item, path))
            else:
                pending.extend(collect_pending(item, f"{path}[{idx}]"))
    return pending


def validate(data: dict, schema: dict) -> list[str]:
    errors: list[str] = []

    # 1. JSON Schema validation (via jsonschema if installed)
    try:
        import jsonschema  # type: ignore

        validator_cls = getattr(jsonschema, "Draft202012Validator", jsonschema.Draft7Validator)
        validator = validator_cls(schema)
        for err in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
            loc = ".".join(str(p) for p in err.path) or "<root>"
            errors.append(f"Schema error at {loc}: {err.message}")
    except ImportError:
        # Fallback top-level required key check if jsonschema is not installed
        for req in schema.get("required", []):
            if req not in data:
                errors.append(f"Missing required top-level key: {req}")

    # 2. ID uniqueness and kebab-case checks
    def check_collection_ids(items: list[dict], label: str) -> set[str]:
        seen: set[str] = set()
        for item in items:
            item_id = item.get("id")
            if not item_id or not isinstance(item_id, str):
                errors.append(f"{label}: item missing string 'id'")
                continue
            if not KEBAB_RE.match(item_id):
                errors.append(f"{label}: id '{item_id}' is not kebab-case")
            if item_id in seen:
                errors.append(f"{label}: duplicate id '{item_id}'")
            seen.add(item_id)
        return seen

    people_ids = check_collection_ids(data.get("people", []), "people")
    group_ids = check_collection_ids(data.get("groups", []), "groups")
    domain_ids = check_collection_ids(data.get("domains", []), "domains")
    question_ids = check_collection_ids(data.get("researchQuestions", []), "researchQuestions")
    phase_ids = check_collection_ids(data.get("roadmap", {}).get("phases", []), "roadmap.phases")
    programme_ids = check_collection_ids(data.get("programmes", {}).get("items", []), "programmes.items")
    project_ids = check_collection_ids(data.get("projects", {}).get("items", []), "projects.items")
    pathway_ids = check_collection_ids(data.get("join", {}).get("pathways", []), "join.pathways")
    news_ids = check_collection_ids(data.get("news", {}).get("items", []), "news.items")
    page_ids = check_collection_ids(data.get("pages", []), "pages")

    _ = (group_ids, phase_ids, project_ids, pathway_ids, news_ids)

    # 3. Referential integrity
    # 3a. Groups -> personId
    for group in data.get("groups", []):
        gid = group.get("id", "?")
        seen_members: set[str] = set()
        for member in group.get("members", []):
            pid = member.get("personId")
            if pid not in people_ids:
                errors.append(f"groups[{gid}]: unknown personId '{pid}'")
            if pid in seen_members:
                errors.append(f"groups[{gid}]: duplicate member personId '{pid}'")
            seen_members.add(pid)

    # 3b. Contact -> personId
    for c in data.get("contact", {}).get("contacts", []):
        pid = c.get("personId")
        if pid not in people_ids:
            errors.append(f"contact.contacts: unknown personId '{pid}'")

    # 3c. Domains -> pageId and questionId
    for dom in data.get("domains", []):
        did = dom.get("id", "?")
        if dom.get("pageId") not in page_ids:
            errors.append(f"domains[{did}]: unknown pageId '{dom.get('pageId')}'")
        for q in dom.get("questions", []):
            qid = q.get("questionId")
            if qid not in question_ids:
                errors.append(f"domains[{did}].questions: unknown questionId '{qid}'")

    # 3d. Programmes -> domainId
    for prog in data.get("programmes", {}).get("items", []):
        prid = prog.get("id", "?")
        did = prog.get("domainId")
        if did is not None and did not in domain_ids:
            errors.append(f"programmes.items[{prid}]: unknown domainId '{did}'")

    # 3e. Projects -> domainIds, questionIds, programmeId, leadPersonId, memberPersonIds, updates
    for proj in data.get("projects", {}).get("items", []):
        prid = proj.get("id", "?")
        for did in proj.get("domainIds", []):
            if did not in domain_ids:
                errors.append(f"projects.items[{prid}]: unknown domainId '{did}'")
        for qid in proj.get("questionIds", []):
            if qid not in question_ids:
                errors.append(f"projects.items[{prid}]: unknown questionId '{qid}'")
        prog_id = proj.get("programmeId")
        if prog_id is not None and prog_id not in programme_ids:
            errors.append(f"projects.items[{prid}]: unknown programmeId '{prog_id}'")
        lead_id = proj.get("leadPersonId")
        if lead_id not in people_ids:
            errors.append(f"projects.items[{prid}]: unknown leadPersonId '{lead_id}'")
        for mpid in proj.get("memberPersonIds", []):
            if mpid not in people_ids:
                errors.append(f"projects.items[{prid}]: unknown memberPersonId '{mpid}'")
        check_collection_ids(proj.get("updates", []), f"projects.items[{prid}].updates")
        for upd in proj.get("updates", []):
            apid = upd.get("authorPersonId")
            if apid not in people_ids:
                errors.append(
                    f"projects.items[{prid}].updates[{upd.get('id')}]: unknown authorPersonId '{apid}'"
                )

    # 3f. Nav, footer, hero, platform, join -> pageId
    for nav_item in data.get("site", {}).get("nav", []):
        if nav_item.get("pageId") not in page_ids:
            errors.append(f"site.nav: unknown pageId '{nav_item.get('pageId')}'")

    for fg in data.get("site", {}).get("footer", {}).get("groups", []):
        for link in fg.get("links", []):
            if link.get("pageId") not in page_ids:
                errors.append(f"site.footer.groups[{fg.get('title')}]: unknown pageId '{link.get('pageId')}'")

    for cta in data.get("org", {}).get("hero", {}).get("ctas", []):
        if cta.get("pageId") not in page_ids:
            errors.append(f"org.hero.ctas: unknown pageId '{cta.get('pageId')}'")

    plat_cta_page = data.get("platform", {}).get("cta", {}).get("pageId")
    if plat_cta_page not in page_ids:
        errors.append(f"platform.cta: unknown pageId '{plat_cta_page}'")

    join_teaser_page = data.get("join", {}).get("homeTeaser", {}).get("pageId")
    if join_teaser_page not in page_ids:
        errors.append(f"join.homeTeaser: unknown pageId '{join_teaser_page}'")

    join_outro_page = data.get("join", {}).get("outro", {}).get("pageId")
    if join_outro_page not in page_ids:
        errors.append(f"join.outro: unknown pageId '{join_outro_page}'")

    # 3g. Pages -> description or descriptionRef
    for page in data.get("pages", []):
        pid = page.get("id", "?")
        seo = page.get("seo", {})
        desc = seo.get("description")
        desc_ref = seo.get("descriptionRef")
        if not desc and not desc_ref:
            errors.append(f"pages[{pid}].seo: must provide either description or descriptionRef")
        if desc_ref:
            resolved = resolve_ref(data, desc_ref)
            if not isinstance(resolved, str) or not resolved.strip():
                errors.append(
                    f"pages[{pid}].seo.descriptionRef: '{desc_ref}' did not resolve to a non-empty string"
                )

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate data/site-data.json")
    parser.add_argument("--pending", action="store_true", help="List all pending-praveen items")
    args = parser.parse_args()

    if not DATA_PATH.exists():
        print(f"ERROR: {DATA_PATH} not found", file=sys.stderr)
        sys.exit(1)
    if not SCHEMA_PATH.exists():
        print(f"ERROR: {SCHEMA_PATH} not found", file=sys.stderr)
        sys.exit(1)

    with DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    with SCHEMA_PATH.open("r", encoding="utf-8") as f:
        schema = json.load(f)

    errors = validate(data, schema)
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} error(s)):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    print(
        f"OK: {DATA_PATH.relative_to(ROOT)} is valid "
        f"({len(data['people'])} people, {len(data['groups'])} groups, "
        f"{len(data['domains'])} domains, {len(data['projects']['items'])} projects, "
        f"{len(data['pages'])} pages)."
    )

    if args.pending:
        pending = collect_pending(data)
        print(f"\nPending decisions ({len(pending)} item(s) marked 'pending-praveen'):")
        for item in pending:
            print(f"  * {item}")


if __name__ == "__main__":
    main()
