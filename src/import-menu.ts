import type { MenuItem } from "./model";

export type ImportResult = { items: MenuItem[]; skipped: string[] };

// Only priced lines become items; ambiguous content stays visible for staff review.
export function parseMenu(text: string): ImportResult {
  let category = "Mains";
  const items: MenuItem[] = [];
  const skipped: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,3}\s+/.test(line) || /^[^$|\d]{1,60}:$/.test(line)) {
      category =
        line
          .replace(/^#{1,3}\s+/, "")
          .replace(/:$/, "")
          .trim() || "Mains";
      continue;
    }
    const match = line.match(
      /^(.+?)(?:\s*\|\s*|\s+[-–—]\s*|\s+)(\$?\s*\d{1,4}(?:\.\d{2})?)\s*$/,
    );
    if (
      !match ||
      !match[1].trim() ||
      (!line.includes("$") && !line.includes("|") && !/\d+\.\d{2}$/.test(line))
    ) {
      skipped.push(line);
      continue;
    }
    const price = Math.round(Number(match[2].replace(/[$\s]/g, "")) * 100);
    const parts = match[1]
      .replace(/[|\s\-–—]+$/, "")
      .split("|")
      .map((part) => part.trim());
    const name = parts[0].replace(/^[-•]\s*/, "");
    const description = parts.slice(1).join(" | ");
    if (
      !name ||
      name.length > 100 ||
      description.length > 500 ||
      price > 100000 ||
      items.length >= 100
    ) {
      skipped.push(line);
      continue;
    }
    items.push({
      id: crypto.randomUUID(),
      name,
      description,
      price,
      category,
      dietary: [],
      available: true,
    });
  }
  return { items, skipped };
}

export async function extractPdf(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Please choose a PDF smaller than 10 MB.");
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const document = await task.promise;
    if (document.numPages > 20)
      throw new Error("Please use a menu PDF with 20 pages or fewer.");
    const pages: string[] = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let line = "";
      let lastY: number | undefined;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5];
        if (lastY !== undefined && Math.abs(y - lastY) > 4 && line) {
          lines.push(line);
          line = "";
        }
        line += (line ? " " : "") + item.str;
        lastY = y;
        if (item.hasEOL) {
          lines.push(line);
          line = "";
          lastY = undefined;
        }
      }
      if (line) lines.push(line);
      pages.push(lines.join("\n"));
    }
    const text = pages.join("\n\n").trim();
    if (!text)
      throw new Error(
        "This PDF has no readable text. Scanned menus need OCR first, or you can type the menu below.",
      );
    return text;
  } finally {
    await task.destroy();
  }
}
