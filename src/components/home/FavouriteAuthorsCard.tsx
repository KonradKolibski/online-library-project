import { Users } from "lucide-react";
import { placeholderColors } from "@/lib/placeholder";
import { SectionHeader } from "./SectionHeader";

interface AuthorSummary {
  name: string;
  count: number;
}

interface FavouriteAuthorsCardProps {
  authors: AuthorSummary[];
}

/**
 * Ranks the user's library by author book count. No "favourite" flag exists
 * yet — we infer from frequency, which is the most honest signal we have.
 */
export function FavouriteAuthorsCard({ authors }: FavouriteAuthorsCardProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Your favourite authors" />
      {authors.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="rounded-2xl bg-card border border-border divide-y divide-border/60">
          {authors.map((a) => (
            <li
              key={a.name}
              className="flex items-center gap-3 px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl"
            >
              <AuthorAvatar name={a.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {a.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.count} book{a.count === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AuthorAvatar({ name }: { name: string }) {
  const { background, foreground } = placeholderColors(name);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
      style={{ background, color: foreground }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-6 flex flex-col items-center text-center gap-2">
      <div className="rounded-xl bg-muted/60 p-2.5 text-muted-foreground">
        <Users className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">No authors yet</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Add some books and we'll rank your most-read authors here.
      </p>
    </div>
  );
}
