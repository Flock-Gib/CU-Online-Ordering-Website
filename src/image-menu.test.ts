import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorker } from "tesseract.js";
import { extractPng } from "./image-menu";
import { prepareMenuImage } from "./prepare-menu-image";

const { recognize, terminate, setParameters } = vi.hoisted(() => ({
  recognize: vi.fn(),
  terminate: vi.fn(),
  setParameters: vi.fn(),
}));
vi.mock("./prepare-menu-image", () => ({ prepareMenuImage: vi.fn() }));
vi.mock("tesseract.js", () => ({
  OEM: { LSTM_ONLY: 1 },
  PSM: { SPARSE_TEXT: "11" },
  createWorker: vi.fn(async () => ({ recognize, terminate, setParameters })),
}));
const soupTsv =
  "5\t1\t1\t1\t1\t1\t10\t10\t60\t20\t97\tSoup\n5\t1\t2\t1\t1\t1\t200\t10\t40\t20\t97\t$4.50";

function png(width = 1000, height = 800) {
  const bytes = new ArrayBuffer(33);
  const header = new DataView(bytes);
  [0x89504e47, 0x0d0a1a0a, 13, 0x49484452, width, height].forEach(
    (value, index) => header.setUint32(index * 4, value),
  );
  const file = new File([bytes], "menu.png", { type: "image/png" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes,
    configurable: true,
  });
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
    }),
  );
  terminate.mockResolvedValue(undefined);
  recognize.mockResolvedValue({ data: { tsv: soupTsv } });
  vi.mocked(prepareMenuImage).mockResolvedValue([
    document.createElement("canvas"),
  ]);
  setParameters.mockResolvedValue(undefined);
});

describe("PNG menu recognition", () => {
  it("extracts trimmed text using local assets and releases the worker", async () => {
    expect(await extractPng(png())).toBe("Soup $4.50");
    const options = vi.mocked(createWorker).mock.calls[0][2];
    expect(options?.workerPath).toMatch(/^http:\/\/localhost/);
    expect(options?.corePath).toMatch(/^http:\/\/localhost/);
    expect(terminate).toHaveBeenCalledOnce();
  });
  it("rejects oversized, invalid and excessive-resolution files before OCR", async () => {
    const large = png();
    Object.defineProperty(large, "size", { value: 11 * 1024 * 1024 });
    await expect(extractPng(large)).rejects.toThrow("10 MB");
    const invalid = png();
    Object.defineProperty(invalid, "arrayBuffer", {
      value: async () => new ArrayBuffer(33),
      configurable: true,
    });
    await expect(extractPng(invalid)).rejects.toThrow("valid PNG");
    await expect(extractPng(png(5000, 5000))).rejects.toThrow("16 million");
    expect(createWorker).not.toHaveBeenCalled();
  });
  it("reports missing text and OCR failures, always releasing the worker", async () => {
    recognize.mockResolvedValueOnce({ data: { tsv: " \n" } });
    await expect(extractPng(png())).rejects.toThrow("No readable text");
    recognize.mockRejectedValueOnce(new Error("Could not decode image"));
    await expect(extractPng(png())).rejects.toThrow("Could not decode image");
    expect(terminate).toHaveBeenCalledTimes(2);
  });
  it("reads each prepared section independently in the selected layout", async () => {
    vi.mocked(prepareMenuImage).mockResolvedValue([
      document.createElement("canvas"),
      document.createElement("canvas"),
    ]);
    expect(await extractPng(png(), () => {}, "columns")).toBe(
      "Soup $4.50\n\nSoup $4.50",
    );
    expect(prepareMenuImage).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      1000,
      800,
      "columns",
    );
    expect(setParameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: "11" });
    expect(recognize).toHaveBeenCalledTimes(2);
    expect(terminate).toHaveBeenCalledOnce();
  });
  it("reports missing word geometry rather than falling back to mixed text", async () => {
    recognize.mockResolvedValueOnce({ data: { text: "Soup $4.50" } });
    await expect(extractPng(png())).rejects.toThrow("word positions");
    expect(terminate).toHaveBeenCalledOnce();
  });
  it("reports local language asset download failures", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    await expect(extractPng(png())).rejects.toThrow("could not be loaded");
    expect(createWorker).not.toHaveBeenCalled();
  });
});
