interface Props {
  className?: string;
}

/**
 * "Reading glasses" illustration from Storyset, served from
 * public/illustrations/reading-glasses.svg.
 */
export function BookshelfIllustration({ className }: Props) {
  return (
    <img
      src="/illustrations/reading-glasses.svg"
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}
