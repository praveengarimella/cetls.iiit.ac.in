import assert from "node:assert/strict";
import test from "node:test";
import { defaultSiteData } from "../site-data.ts";
import { computeSiteDataDiff } from "./diff.ts";

test("computeSiteDataDiff returns empty array for identical data", () => {
  const clone = JSON.parse(JSON.stringify(defaultSiteData));
  const diffs = computeSiteDataDiff(defaultSiteData, clone);
  assert.deepEqual(diffs, []);
});

test("computeSiteDataDiff detects scalar and id-keyed array changes", () => {
  const next = JSON.parse(JSON.stringify(defaultSiteData));
  next.org.hero.headline = "Updated Hero Headline";
  if (next.news.items.length > 0) {
    next.news.items[0] = { ...next.news.items[0], title: "Updated News Title" };
  }
  const diffs = computeSiteDataDiff(defaultSiteData, next);
  assert.ok(diffs.some((d) => d.path === "org.hero.headline" && d.kind === "changed"));
  if (next.news.items.length > 0) {
    assert.ok(
      diffs.some(
        (d) =>
          d.path.includes(`news.items[id=${next.news.items[0].id}].title`) &&
          d.kind === "changed",
      ),
    );
  }
});
