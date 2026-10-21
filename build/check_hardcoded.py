#!/usr/bin/env python3
"""
CI check: fails if any fact from data/site-data.json appears literally in template source.
Checks:
- Every person's name (if >= 6 chars)
- Every email address
- Every external URL (profile links, Formspree endpoint)
- Every prose string >= 40 characters from data/site-data.json (both raw and token-resolved)
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "site-data.json"

# Only check UI template / route / component source files.
# Exclude the data loader modules (site-data.ts, site-data.types.ts, seo.ts) and pre-wired platform libs.
EXCLUDED_PATHS = {
    ROOT / "src" / "lib" / "site-data.ts",
    ROOT / "src" / "lib" / "site-data.types.ts",
    ROOT / "src" / "lib" / "seo.ts",
    ROOT / "src" / "routeTree.gen.ts",
}


def make_token_resolver(data: dict):
    tokens = {
        "org.name": data["org"]["name"]["value"],
        "org.shortName": data["org"]["shortName"],
        "parent.name": data["org"]["parent"]["name"],
        "parent.shortName": data["org"]["parent"]["shortName"],
        "parent.abbreviation": data["org"]["parent"]["abbreviation"],
        "year": str(datetime.now().year),
    }

    def resolve(s: str) -> str:
        return re.sub(r"\{([a-zA-Z.]+)\}", lambda m: tokens.get(m.group(1), m.group(0)), s)

    return resolve


def extract_facts(data: dict) -> list[tuple[str, str]]:
    """Return list of (fact_string, origin_path) to forbid in templates."""
    resolve = make_token_resolver(data)
    facts: dict[str, str] = {}

    # 1. Explicit full organisation name
    org_name = data["org"]["name"]["value"]
    facts[org_name] = "org.name.value"
    for alt in data["org"]["name"].get("alternatives", []):
        facts[alt] = "org.name.alternatives"

    # 2. People names, emails, external links
    for p in data.get("people", []):
        pid = f"people[{p['id']}]"
        if p.get("name") and len(p["name"]) >= 6:
            facts[p["name"]] = f"{pid}.name"
        if p.get("email"):
            facts[p["email"]] = f"{pid}.email"
        for link in p.get("links", []):
            if link.get("url"):
                facts[link["url"]] = f"{pid}.links"

    # 3. Contact form endpoint
    endpoint = data.get("contact", {}).get("form", {}).get("endpoint")
    if endpoint:
        facts[endpoint] = "contact.form.endpoint"

    # 4. All prose strings >= 40 characters anywhere in data (except meta)
    def walk(obj, path="root"):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if path == "root" and k == "meta":
                    continue
                if k in ("stylesheetUrl", "preconnectUrls", "liveBody"):
                    continue
                walk(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                walk(item, f"{path}[{i}]")
        elif isinstance(obj, str):
            s = obj.strip()
            if len(s) >= 40 and not s.startswith("http"):
                facts[s] = path
                resolved = resolve(s)
                if len(resolved) >= 40:
                    facts[resolved] = f"{path} (resolved)"

    walk(data)
    return sorted(facts.items(), key=lambda x: x[0])


def iter_source_files(target_dirs: list[Path]):
    for target in target_dirs:
        if not target.exists():
            continue
        if target.is_file():
            if target.resolve() not in EXCLUDED_PATHS:
                yield target
            continue
        for p in sorted(target.rglob("*")):
            if not p.is_file():
                continue
            if p.suffix not in (".ts", ".tsx", ".js", ".jsx"):
                continue
            if p.resolve() in EXCLUDED_PATHS:
                continue
            # Skip prewired auth/app-data/multiplayer infrastructure
            rel = p.resolve().relative_to(ROOT)
            if len(rel.parts) >= 3 and rel.parts[0] == "src" and rel.parts[1] == "lib" and rel.parts[2] in (
                "auth",
                "app-data",
                "multiplayer",
                "og",
            ):
                continue
            yield p


def main():
    args = sys.argv[1:] or ["src"]
    target_dirs = [(ROOT / a).resolve() for a in args]

    with DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    facts = extract_facts(data)
    violations: list[str] = []

    for src_file in iter_source_files(target_dirs):
        content = src_file.read_text(encoding="utf-8")
        rel_path = src_file.resolve().relative_to(ROOT)
        for fact_str, origin in facts:
            if fact_str in content:
                preview = fact_str if len(fact_str) <= 70 else fact_str[:67] + "..."
                violations.append(f"{rel_path}: contains hardcoded '{preview}' (from {origin})")

    if violations:
        print(f"HARDCODED FACT CHECK FAILED ({len(violations)} violation(s)):", file=sys.stderr)
        for v in violations:
            print(f"  - {v}", file=sys.stderr)
        sys.exit(1)

    print(f"OK: 0 hardcoded facts found across {', '.join(args)} ({len(facts)} facts checked).")


if __name__ == "__main__":
    main()
