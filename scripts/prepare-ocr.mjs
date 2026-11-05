import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const target = new URL("../public/ocr/", import.meta.url);
await mkdir(target, { recursive: true });
for (const [source, filename] of [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  [
    "tesseract.js-core/tesseract-core-lstm.wasm.js",
    "tesseract-core-lstm.wasm.js",
  ],
  [
    "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    "eng.traineddata.gz",
  ],
]) {
  await copyFile(
    require.resolve(source),
    fileURLToPath(new URL(filename, target)),
  );
}
