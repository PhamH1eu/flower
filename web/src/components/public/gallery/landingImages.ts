import { listImages } from "@/lib/api/images";
import type {
  GalleryImage,
  ImageCategory,
  LandingImageSlot,
} from "@/lib/api/types";

type LandingImageFallback = {
  category?: ImageCategory;
  latest?: boolean;
};

export async function loadLandingImage(
  slot: LandingImageSlot,
  fallback: LandingImageFallback = {},
  signal?: AbortSignal,
): Promise<GalleryImage | undefined> {
  const primary = await readFirstImage({ landingSlot: slot }, signal);
  if (primary) return primary;

  if (fallback.category) {
    const categoryImage = await readFirstImage(
      { category: fallback.category },
      signal,
    );
    if (categoryImage) return categoryImage;
  }

  if (fallback.latest) {
    return readFirstImage({}, signal);
  }

  return undefined;
}

async function readFirstImage(
  params: Parameters<typeof listImages>[0],
  signal?: AbortSignal,
) {
  try {
    const page = await listImages({ ...params, limit: 1 }, signal);
    return page.items[0];
  } catch {
    return undefined;
  }
}
