import assert from "node:assert/strict";
import test from "node:test";
import { computeMarkdownDiff, summarizeDiffCounts } from "./line-diff.ts";

test("computeMarkdownDiff detects unchanged, added, and removed lines with word spans", () => {
  const before = "# About\n\nOur vision is learning for everyone.\nOld line.";
  const after = "# About\n\nOur vision is mastery learning for everyone.\nNew line\nExtra line";

  const diff = computeMarkdownDiff(before, after);
  const counts = summarizeDiffCounts(diff);

  assert.equal(counts.removed, 2);
  assert.equal(counts.added, 3);

  const addedVision = diff.find(
    (l) => l.kind === "added" && l.text.includes("mastery learning"),
  );
  assert.ok(addedVision?.spans?.some((s) => s.kind === "added" && s.text.includes("mastery")));
});
