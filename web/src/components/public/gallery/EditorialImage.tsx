import type { GalleryImage } from "@/lib/api/types";

type EditorialImageProps = {
  image?: GalleryImage;
  label: string;
  aspect?: string;
  className?: string;
  priority?: boolean;
  overlay?: boolean;
};

export function EditorialImage({
  image,
  label,
  aspect = "aspect-[4/5]",
  className = "",
  priority = false,
  overlay = false,
}: EditorialImageProps) {
  return (
    <div
      className={`relative overflow-hidden bg-silver-soft ${aspect} ${className}`}
    >
      {image?.url || image?.thumbUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url || image.thumbUrl}
            alt={image.alt || label}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.025]"
          />
          {overlay ? (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/10 to-transparent" />
          ) : null}
        </>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--silver-soft),#f7f7f4_46%,#d9dadd)]" />
      )}
    </div>
  );
}
