import { useState } from "react";
import { cn } from "@/lib/utils";

interface CoverImageProps {
  title: string;
  src?: string;
  className?: string;
  rounded?: string;
}

/** Neutral "no cover" placeholder — served from public/. */
const PLACEHOLDER_SRC = "/book-cover-placeholder.jpg";

export function CoverImage({ title, src, className, rounded = "rounded-xl" }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={cn(
        "relative w-full aspect-[3/4] overflow-hidden",
        rounded,
        className,
      )}
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
        <img
          src={PLACEHOLDER_SRC}
          alt={title || "No cover"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
}
