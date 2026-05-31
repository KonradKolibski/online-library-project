import { Compass } from "lucide-react";

export function DiscoverPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-2xl bg-primary/10 p-5 text-primary">
        <Compass className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight">Discover</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Mood-based book search, curated picks, and personalised recommendations — coming soon.
      </p>
    </div>
  );
}
