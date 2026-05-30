import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryManager } from "@/components/settings/CategoryManager";

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
        <div>
          <h3 className="text-lg font-semibold">Categories</h3>
          <p className="text-sm text-muted-foreground">
            Add, rename, or delete categories. Deleting one moves its books to "Uncategorized".
          </p>
        </div>
        <CategoryManager />
      </section>
    </div>
  );
}
