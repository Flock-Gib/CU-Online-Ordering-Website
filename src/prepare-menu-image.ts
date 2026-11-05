export type PngLayout = "auto" | "single" | "columns";
export type ImageRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
  headingHeight: number;
};
type Band = { left: number; top: number; right: number; bottom: number };

// Solid section bands identify columns without relying on dish names or fixed coordinates.
export function menuImageRegions(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  layout: PngLayout,
): ImageRegion[] {
  const bands: Band[] = [];
  for (let y = 0; y < height; y += 2) {
    let start = -1;
    for (let x = 0; x <= width + 1; x += 2) {
      const offset = (y * width + x) * 4;
      const maximum = Math.max(
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      );
      const minimum = Math.min(
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      );
      const colored = x < width && maximum < 180 && maximum - minimum > 40;
      if (colored && start < 0) start = x;
      if (!colored && start >= 0) {
        if (x - start > width * 0.18) {
          const previous = bands
            .slice()
            .reverse()
            .find(
              (band) =>
                y - band.bottom < height * 0.017 &&
                Math.min(band.right, x) - Math.max(band.left, start) >
                  0.8 * Math.min(band.right - band.left, x - start),
            );
          if (previous) {
            previous.left = Math.min(previous.left, start);
            previous.right = Math.max(previous.right, x);
            previous.bottom = y;
          } else bands.push({ left: start, top: y, right: x, bottom: y });
        }
        start = -1;
      }
    }
  }
  const panels = bands.filter(
    (band) =>
      band.bottom - band.top >= Math.max(6, height * 0.005) &&
      band.bottom - band.top < height * 0.1 &&
      band.right - band.left < width * 0.75,
  );
  const columns: Band[][] = [];
  for (const panel of panels.sort((a, b) => a.left - b.left)) {
    const column = columns.find(
      (group) => Math.abs(group[0].left - panel.left) < width * 0.05,
    );
    if (column) column.push(panel);
    else columns.push([panel]);
  }
  const twoColumns =
    columns.length === 2 &&
    columns[1][0].left - columns[0][0].left > width * 0.25;
  if (layout !== "single" && twoColumns) {
    const regions: ImageRegion[] = [];
    for (const group of columns) {
      group.sort((a, b) => a.top - b.top);
      const left = Math.min(...group.map((band) => band.left));
      const right = Math.min(...group.map((band) => band.right));
      for (let index = 0; index < group.length; index++) {
        const band = group[index];
        const footer = bands.find(
          (candidate) =>
            candidate.top > band.bottom &&
            candidate.right - candidate.left > width * 0.75,
        );
        const bottom = group[index + 1]?.top ?? footer?.top ?? height;
        regions.push({
          left,
          top: band.top,
          width: right - left,
          height: bottom - band.top,
          headingHeight: band.bottom - band.top + 2,
        });
      }
    }
    return regions;
  }
  const count = layout === "columns" ? 2 : 1;
  return Array.from({ length: count }, (_, index) => {
    const left = Math.floor((width * index) / count);
    return {
      left,
      top: 0,
      width: Math.floor((width * (index + 1)) / count) - left,
      height,
      headingHeight: 0,
    };
  });
}

// Repeated leader dots can make Tesseract discard the entire name/price line.
export function removePriceLeaders(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
) {
  const visited = new Uint8Array(width * height);
  const dots: { left: number; right: number; top: number; bottom: number }[] =
    [];
  for (let origin = 0; origin < visited.length; origin++) {
    if (visited[origin] || pixels[origin * 4] !== 0) continue;
    const stack = [origin];
    visited[origin] = 1;
    let left = width,
      right = 0,
      top = height,
      bottom = 0;
    while (stack.length) {
      const point = stack.pop()!;
      const x = point % width,
        y = Math.floor(point / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const next of [
        x > 0 ? point - 1 : -1,
        x + 1 < width ? point + 1 : -1,
        y > 0 ? point - width : -1,
        y + 1 < height ? point + width : -1,
      ]) {
        if (next >= 0 && !visited[next] && pixels[next * 4] === 0) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }
    if (right - left < 4 * scale && bottom - top < 4 * scale)
      dots.push({ left, right, top, bottom });
  }
  const rows: (typeof dots)[] = [];
  for (const dot of dots.sort((a, b) => a.top + a.bottom - b.top - b.bottom)) {
    const row = rows.find(
      (group) =>
        Math.abs(group[0].top + group[0].bottom - dot.top - dot.bottom) <
        3.4 * scale,
    );
    if (row) row.push(dot);
    else rows.push([dot]);
  }
  const erase = (run: typeof dots) => {
    if (run.length < 6) return;
    for (const dot of run)
      for (let y = dot.top; y <= dot.bottom; y++)
        for (let x = dot.left; x <= dot.right; x++)
          pixels.fill(255, (y * width + x) * 4, (y * width + x) * 4 + 3);
  };
  for (const row of rows) {
    let run: typeof dots = [];
    for (const dot of row.sort((a, b) => a.left - b.left)) {
      if (run.length && dot.left - run[run.length - 1].left > 10 * scale) {
        erase(run);
        run = [];
      }
      run.push(dot);
    }
    erase(run);
  }
}

export async function prepareMenuImage(
  bytes: ArrayBuffer,
  width: number,
  height: number,
  layout: PngLayout,
): Promise<HTMLCanvasElement[]> {
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: "image/png" }),
  );
  try {
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const context = source.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error(
        "This browser cannot prepare menu images. Try a current browser or type the menu.",
      );
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const regions = menuImageRegions(
      context.getImageData(0, 0, width, height).data,
      width,
      height,
      layout,
    );
    return regions.map((region) => {
      const scale = Math.min(
        3,
        2400 / region.width,
        Math.sqrt(8_000_000 / (region.width * region.height)),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(region.width * scale) + 40;
      canvas.height = Math.ceil(region.height * scale) + 40;
      const output = canvas.getContext("2d", { willReadFrequently: true });
      if (!output)
        throw new Error(
          "This browser cannot prepare menu images. Try a current browser or type the menu.",
        );
      output.fillStyle = "white";
      output.fillRect(0, 0, canvas.width, canvas.height);
      output.drawImage(
        source,
        region.left,
        region.top,
        region.width,
        region.height,
        20,
        20,
        region.width * scale,
        region.height * scale,
      );
      const image = output.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < image.data.length; index += 4) {
        const y = Math.floor(index / 4 / canvas.width);
        const x = (index / 4) % canvas.width;
        let gray =
          0.299 * image.data[index] +
          0.587 * image.data[index + 1] +
          0.114 * image.data[index + 2];
        if (
          region.headingHeight &&
          y >= 20 &&
          y < 20 + region.headingHeight * scale &&
          x >= 20 &&
          x < canvas.width - 20
        )
          gray = 255 - gray;
        const value = gray > 155 ? 255 : 0;
        image.data[index] =
          image.data[index + 1] =
          image.data[index + 2] =
            value;
        image.data[index + 3] = 255;
      }
      removePriceLeaders(image.data, canvas.width, canvas.height, scale);
      output.putImageData(image, 0, 0);
      return canvas;
    });
  } finally {
    bitmap.close();
  }
}
