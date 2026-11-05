type Word = {
  text: string;
  left: number;
  center: number;
  height: number;
  confidence: number;
};

// Sparse OCR returns names and prices in different blocks; match their baselines.
export function ocrMenuLines(tsv: string): string {
  const words: Word[] = [];
  for (const row of tsv.split("\n")) {
    const fields = row.split("\t");
    if (fields[0] !== "5" || !fields[11]?.trim()) continue;
    const [left, top, , height, confidence] = fields.slice(6, 11).map(Number);
    if (![left, top, height, confidence].every(Number.isFinite) || height <= 0)
      continue;
    const text = fields.slice(11).join("\t").trim();
    if (!/[\p{L}\d$&+]/u.test(text)) continue;
    words.push({ text, left, center: top + height / 2, height, confidence });
  }
  const lines: { center: number; height: number; words: Word[] }[] = [];
  for (const word of words.sort((a, b) => a.center - b.center)) {
    const line = lines.find(
      (candidate) =>
        Math.abs(candidate.center - word.center) <
        Math.min(candidate.height, word.height) * 0.6,
    );
    if (line) line.words.push(word);
    else
      lines.push({ center: word.center, height: word.height, words: [word] });
  }
  let category = "";
  return lines
    .map((line) => {
      const ordered = line.words.sort((a, b) => a.left - b.left);
      const text = ordered.map((word) => word.text).join(" ");
      const priceWords = ordered.filter((word) => /\$|\d/.test(word.text));
      const confident =
        ordered.every((word) => word.confidence >= 45) &&
        priceWords.every((word) => word.confidence >= 80);
      if (text.includes("$") && !confident) return `[Needs review] ${text}`;
      if (/^[A-Z][A-Z &+’'-]{3,}$/.test(text) && confident) {
        category = text;
        return `# ${text}`;
      }
      const base = text.match(/^\$(\d+(?:\.\d{2})?)\s+BASE$/i);
      if (base && category) return `${category} (base) | $${base[1]}`;
      return text;
    })
    .join("\n");
}
