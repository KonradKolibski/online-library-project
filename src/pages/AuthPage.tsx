import { useState, type FormEvent } from "react";
import { BookOpenText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth";

type Mode = "login" | "register";

export function AuthPage() {
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithPassword(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setInfo(
            "Check your email to confirm your account, then sign in.",
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-6 rounded-3xl border border-border bg-card/80 backdrop-blur p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-primary/15 p-3 text-primary">
            <BookOpenText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Capy Books</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Sign in to sync your library."
                : "Create an account to start your library."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-muted p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
            className={`rounded-lg py-2 font-medium transition-colors ${
              mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
              setInfo(null);
            }}
            className={`rounded-lg py-2 font-medium transition-colors ${
              mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {info && (
            <p className="text-sm text-muted-foreground">{info}</p>
          )}

          <Button type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
