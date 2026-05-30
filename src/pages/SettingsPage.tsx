import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { BookshelfIllustration } from "@/components/illustrations/BookshelfIllustration";

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4 rounded-3xl bg-gradient-to-br from-indigo-100/60 via-pink-100/50 to-amber-100/40 p-5">
          <div>
            <h3 className="text-lg font-semibold">Categories</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Add, rename, or delete categories. Deleting one moves its books to "Uncategorized".
            </p>
          </div>
          <BookshelfIllustration className="hidden sm:block w-32 shrink-0" />
        </div>
        <CategoryManager />
      </section>
    </div>
  );
}
