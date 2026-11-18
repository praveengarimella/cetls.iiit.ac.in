import type { DiffLine, DiffWordSpan } from "./types";

function lcsMatrix<T>(a: T[], b: T[]): Uint16Array[] {
  const m = a.length;
  const n = b.length;
  const dp: Uint16Array[] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }
  return dp;
}

function tokenizeWords(line: string): string[] {
  return line.match(/\S+|\s+/g) ?? [];
}

function computeInlineSpans(
  oldLine: string,
  newLine: string,
): { oldSpans: DiffWordSpan[]; newSpans: DiffWordSpan[] } {
  const a = tokenizeWords(oldLine);
  const b = tokenizeWords(newLine);
  if (a.length * b.length > 40000) {
    return {
      oldSpans: [{ text: oldLine, kind: "removed" }],
      newSpans: [{ text: newLine, kind: "added" }],
    };
  }
  const dp = lcsMatrix(a, b);
  const oldSpans: DiffWordSpan[] = [];
  const newSpans: DiffWordSpan[] = [];

  const pushSpan = (arr: DiffWordSpan[], kind: DiffWordSpan["kind"], text: string) => {
    const last = arr[arr.length - 1];
    if (last && last.kind === kind) {
      last.text += text;
    } else {
      arr.push({ kind, text });
    }
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pushSpan(oldSpans, "equal", a[i]);
      pushSpan(newSpans, "equal", b[j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushSpan(oldSpans, "removed", a[i]);
      i += 1;
    } else {
      pushSpan(newSpans, "added", b[j]);
      j += 1;
    }
  }
  while (i < a.length) {
    pushSpan(oldSpans, "removed", a[i]);
    i += 1;
  }
  while (j < b.length) {
    pushSpan(newSpans, "added", b[j]);
    j += 1;
  }

  return { oldSpans, newSpans };
}

export function computeMarkdownDiff(beforeText: string, afterText: string): DiffLine[] {
  const a = beforeText.replace(/\r\n/g, "\n").split("\n");
  const b = afterText.replace(/\r\n/g, "\n").split("\n");
  const dp = lcsMatrix(a, b);

  const raw: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldLineNo = 1;
  let newLineNo = 1;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      raw.push({
        kind: "equal",
        oldLineNumber: oldLineNo++,
        newLineNumber: newLineNo++,
        text: a[i],
      });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({
        kind: "removed",
        oldLineNumber: oldLineNo++,
        newLineNumber: null,
        text: a[i],
      });
      i += 1;
    } else {
      raw.push({
        kind: "added",
        oldLineNumber: null,
        newLineNumber: newLineNo++,
        text: b[j],
      });
      j += 1;
    }
  }
  while (i < a.length) {
    raw.push({
      kind: "removed",
      oldLineNumber: oldLineNo++,
      newLineNumber: null,
      text: a[i],
    });
    i += 1;
  }
  while (j < b.length) {
    raw.push({
      kind: "added",
      oldLineNumber: null,
      newLineNumber: newLineNo++,
      text: b[j],
    });
    j += 1;
  }

  // Pair adjacent removed + added blocks to compute word-level highlights
  let idx = 0;
  while (idx < raw.length) {
    if (raw[idx].kind === "removed") {
      let remEnd = idx;
      while (remEnd < raw.length && raw[remEnd].kind === "removed") remEnd += 1;
      let addEnd = remEnd;
      while (addEnd < raw.length && raw[addEnd].kind === "added") addEnd += 1;

      const remCount = remEnd - idx;
      const addCount = addEnd - remEnd;
      const pairs = Math.min(remCount, addCount);
      for (let p = 0; p < pairs; p += 1) {
        const remLine = raw[idx + p];
        const addLine = raw[remEnd + p];
        const { oldSpans, newSpans } = computeInlineSpans(remLine.text, addLine.text);
        remLine.spans = oldSpans;
        addLine.spans = newSpans;
      }
      idx = addEnd;
    } else {
      idx += 1;
    }
  }

  return raw;
}

export function summarizeDiffCounts(lines: DiffLine[]): {
  added: number;
  removed: number;
} {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.kind === "added") added += 1;
    else if (l.kind === "removed") removed += 1;
  }
  return { added, removed };
}
