interface Props {
  className?: string;
}

/**
 * Capybara reading books illustration, served from
 * public/illustrations/capybara-reading-books.svg.
 */
export function ReadingIllustration({ className }: Props) {
  return (
    <img
      src="/illustrations/capybara-reading-books.svg"
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}
