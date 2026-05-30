import { useState } from "react";
import { placeholderColors } from "@/lib/placeholder";
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
        <div
          className="absolute inset-0 flex items-center justify-center p-3 text-center"
          style={{ color: foreground }}
        >
          <span className="font-semibold leading-tight text-sm sm:text-base line-clamp-4">
            {title || "Untitled"}
          </span>
        </div>
      )}
    </div>
  );
}
