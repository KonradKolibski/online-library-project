import { useState } from "react";
import { initials, placeholderColors } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

interface CoverImageProps {
  title: string;
  src?: string;
  className?: string;
  rounded?: string;
}

export function CoverImage({ title, src, className, rounded = "rounded-xl" }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  const { background, foreground } = placeholderColors(title);

  return (
    <div
      className={cn(
        "relative w-full aspect-[3/4] overflow-hidden",
        rounded,
        className,
      )}
      style={showImage ? undefined : { background }}
    >
      {showImage ? (
        <img
          src={src}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        // Initials rendered as SVG text so they scale with the cover — sharp and
        // proportional whether it's a 7px session thumbnail or the detail view.
        <svg
          viewBox="0 0 30 40"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={title || "Untitled"}
        >
          <text
            x="15"
            y="20"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fontWeight="600"
            letterSpacing="0.5"
            fill={foreground}
          >
            {initials(title)}
          </text>
        </svg>
      )}
    </div>
  );
}
