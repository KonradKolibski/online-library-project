import { Home } from "lucide-react";

export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-2xl bg-primary/10 p-5 text-primary">
        <Home className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight">Home</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Your personal dashboard — reading activity, recent books, and highlights — coming soon.
      </p>
    </div>
  );
}
