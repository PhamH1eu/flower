import type { GalleryImage } from "@/lib/api/types";

const MIN_TILE_ASPECT_RATIO = 0.56;
const MAX_TILE_ASPECT_RATIO = 1.6;
const FALLBACK_TILE_ASPECT_RATIOS = [
  3 / 4,
  1,
  3 / 5,
  4 / 3,
  3 / 4,
  4 / 5,
  1,
  2 / 3,
  4 / 3,
  3 / 4,
  3 / 5,
  4 / 5,
  1,
  4 / 3,
  2 / 3,
];

type ImageDimensions = Pick<GalleryImage, "width" | "height">;

export type GalleryImageFit = "cover" | "contain";

export function getGalleryImageLayout(
  image: ImageDimensions,
  fallbackIndex = 0,
): { aspectRatio: number; fit: GalleryImageFit } {
  const fallback =
    FALLBACK_TILE_ASPECT_RATIOS[
      fallbackIndex % FALLBACK_TILE_ASPECT_RATIOS.length
    ];

  if (!Number.isFinite(image.width) || !Number.isFinite(image.height)) {
    return { aspectRatio: fallback, fit: "cover" };
  }

  if (image.width <= 0 || image.height <= 0) {
    return { aspectRatio: fallback, fit: "cover" };
  }

  const naturalAspectRatio = image.width / image.height;
  const aspectRatio = clamp(
    naturalAspectRatio,
    MIN_TILE_ASPECT_RATIO,
    MAX_TILE_ASPECT_RATIO,
  );

  return {
    aspectRatio,
    fit: aspectRatio === naturalAspectRatio ? "cover" : "contain",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
