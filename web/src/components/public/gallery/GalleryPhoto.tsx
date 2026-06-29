import type { GalleryImage } from "@/lib/api/types";
import { ImageFrame } from "../ui/ImageFrame";

type GalleryPhotoProps = {
  image?: GalleryImage;
  label: string;
  aspect?: string;
  className?: string;
  flat?: boolean;
};

export function GalleryPhoto({
  image,
  label,
  aspect = "aspect-[4/3]",
  className = "",
  flat = false,
}: GalleryPhotoProps) {
  if (!image?.thumbUrl) {
    return <ImageFrame label={label} aspect={aspect} hover flat={flat} className={className} />;
  }

  return (
    <div
      className={`overflow-hidden rounded-lg bg-silver-soft ring-1 ring-silver ${aspect} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.thumbUrl}
        alt={image.alt || label}
        className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
        loading="lazy"
      />
    </div>
  );
}
