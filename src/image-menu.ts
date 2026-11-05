import { createWorker, OEM, PSM } from "tesseract.js";
import { prepareMenuImage } from "./prepare-menu-image";
import type { PngLayout } from "./prepare-menu-image";
import { ocrMenuLines } from "./ocr-lines";
const ocrAsset = (path: string) =>
  new URL(`${import.meta.env.BASE_URL}ocr/${path}`, window.location.href).href;

export async function extractPng(
  file: File,
  progress: (message: string) => void = () => {},
  layout: PngLayout = "auto",
): Promise<string> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Please choose a PNG smaller than 10 MB.");

  const bytes = await file.arrayBuffer();
  const header = new DataView(bytes);
  if (
    bytes.byteLength < 33 ||
    header.getUint32(0) !== 0x89504e47 ||
    header.getUint32(4) !== 0x0d0a1a0a ||
    header.getUint32(8) !== 13 ||
    header.getUint32(12) !== 0x49484452
  )
    throw new Error(
      "This file is not a valid PNG image. Please export it as PNG and try again.",
    );
  const width = header.getUint32(16);
  const height = header.getUint32(20);
  if (!width || !height || width * height > 16_000_000)
    throw new Error(
      "Please use a PNG with at most 16 million pixels. Resize or crop the menu and try again.",
    );

  progress("Preparing image and separating menu sections...");
  const images = await prepareMenuImage(bytes, width, height, layout);
  progress("Loading text recognition...");
  const response = await fetch(ocrAsset("eng.traineddata.gz"));
  if (!response.ok)
    throw new Error(
      "The text recognition files could not be loaded. Check your connection and try again.",
    );
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: ocrAsset("worker.min.js"),
    corePath: ocrAsset("tesseract-core-lstm.wasm.js"),
    langPath: ocrAsset(""),
    cachePath: "cove-english-accurate-v1",
    logger: ({ status, progress: value }) => {
      progress(
        status === "recognizing text"
          ? `Reading menu image... ${Math.round(value * 100)}%`
          : "Loading text recognition...",
      );
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const sections: string[] = [];
    for (let index = 0; index < images.length; index++) {
      progress(`Reading menu section ${index + 1} of ${images.length}...`);
      const result = await worker.recognize(images[index], {}, { tsv: true });
      if (!result.data.tsv)
        throw new Error(
          "The image reader did not return word positions. Please retry the import or type the menu.",
        );
      sections.push(ocrMenuLines(result.data.tsv));
    }
    const text = sections.join("\n\n").trim();
    if (!text)
      throw new Error(
        "No readable text was found in this PNG. Try a sharper image or type the menu below.",
      );
    return text;
  } finally {
    await worker.terminate();
  }
}
