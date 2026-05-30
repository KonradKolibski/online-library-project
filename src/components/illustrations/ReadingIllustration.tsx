interface Props {
  className?: string;
}

/**
 * "Book lover" illustration from Storyset, served from
 * public/illustrations/book-lover.svg.
 */
export function ReadingIllustration({ className }: Props) {
  return (
    <img
      src="/illustrations/book-lover.svg"
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}
