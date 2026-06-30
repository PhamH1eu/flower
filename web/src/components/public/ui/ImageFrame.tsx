import type { CSSProperties } from "react";

type ImageFrameProps = {
  /** Caption shown inside the placeholder until a real photo is added. */
  label?: string;
  src?: string;
  alt?: string;
  /** Tailwind aspect-ratio class, e.g. "aspect-[4/3]". */
  aspect?: string;
  /** CSS aspect-ratio value for dynamic image dimensions. Overrides aspect. */
  aspectRatio?: number;
  className?: string;
  /** Enable subtle zoom on hover (for gallery/occasion tiles). */
  hover?: boolean;
  fit?: "cover" | "contain";
  /**
   * "flat" drops the matted padding for an edge-to-edge tile (Pinterest-style
   * masonry); "matted" keeps the signature silver double frame (default).
   */
  flat?: boolean;
};

/**
 * Silver-framed image placeholder — the site's signature "viền bạc/trắng" motif.
 * A matted double frame (silver hairline + white gap) wraps a soft neutral fill
 * with a thin-stroke flower mark. Swap the inner fill for a real <Image> later.
 */
export function ImageFrame({
  label,
  src,
  alt = "",
  aspect = "aspect-[4/3]",
  aspectRatio,
  className = "",
  hover = false,
  fit = "cover",
  flat = false,
}: ImageFrameProps) {
  const frameStyle: CSSProperties | undefined = aspectRatio
    ? { aspectRatio }
    : undefined;
  const aspectClass = aspectRatio ? "" : aspect;

  return (
    <div
      className={`rounded-lg bg-surface ring-1 ring-silver ${
        flat ? "" : "p-2 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      } ${className}`}
    >
      <div
        className={`group overflow-hidden ${flat ? "rounded-lg" : "rounded-sm"} ${aspectClass}`}
        style={frameStyle}
      >
        {src ? (
          <img
            src={src}
            alt={alt || label || ""}
            loading="lazy"
            className={`h-full w-full bg-silver-soft transition-transform duration-700 ease-out ${
              fit === "contain" ? "object-contain" : "object-cover"
            } ${hover ? "group-hover:scale-105" : ""}`}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-silver-soft to-[#dfe1e2] transition-transform duration-700 ease-out ${
              hover ? "group-hover:scale-105" : ""
            }`}
          >
            <div className="flex flex-col items-center gap-3 text-muted">
              <FlowerMark />
              {label ? (
                <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em]">
                  {label}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowerMark() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
      className="opacity-60"
    >
      <circle cx="24" cy="20" r="4" />
      <ellipse cx="24" cy="11" rx="3.2" ry="5.5" />
      <ellipse cx="24" cy="29" rx="3.2" ry="5.5" />
      <ellipse cx="15" cy="20" rx="5.5" ry="3.2" />
      <ellipse cx="33" cy="20" rx="5.5" ry="3.2" />
      <ellipse
        cx="17.5"
        cy="13.5"
        rx="5.5"
        ry="3.2"
        transform="rotate(-45 17.5 13.5)"
      />
      <ellipse
        cx="30.5"
        cy="13.5"
        rx="5.5"
        ry="3.2"
        transform="rotate(45 30.5 13.5)"
      />
      <ellipse
        cx="17.5"
        cy="26.5"
        rx="5.5"
        ry="3.2"
        transform="rotate(45 17.5 26.5)"
      />
      <ellipse
        cx="30.5"
        cy="26.5"
        rx="5.5"
        ry="3.2"
        transform="rotate(-45 30.5 26.5)"
      />
      <path d="M24 24 V44" />
      <path d="M24 38 C20 35 17 36 15 39" />
      <path d="M24 34 C28 31 31 32 33 35" />
    </svg>
  );
}
