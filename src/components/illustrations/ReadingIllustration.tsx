interface Props {
  className?: string;
}

/**
 * Capybara reading on a stack of books illustration, served from
 * public/illustrations/capy-reading.png.
 */
export function ReadingIllustration({ className }: Props) {
  return (
    <img
      src="/illustrations/capy-reading.png"
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}
