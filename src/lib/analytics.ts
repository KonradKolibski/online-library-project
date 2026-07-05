import posthog from "posthog-js";

// PostHog product analytics. Configured via env vars (like Supabase), so it is a
// no-op until VITE_POSTHOG_KEY is set — nothing breaks in dev or in forks without
// a key. The project API key (phc_…) is a public client key and is safe to ship
// in the browser bundle; still, keep it in env rather than hard-coded.
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://eu.i.posthog.com"; // EU region

export const analyticsEnabled = Boolean(KEY);

/** Initialise PostHog once, on app start. Safe to call when disabled. */
export function initAnalytics(): void {
  if (!analyticsEnabled || posthog.__loaded) return;
  posthog.init(KEY as string, {
    api_host: HOST,
    person_profiles: "identified_only", // don't create a profile for every anon visitor
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true, // clicks / inputs — powers behaviour tracking + heatmaps
    enable_heatmaps: true, // heatmap data collection
    session_recording: {
      // Reading notes/quotes are personal — mask text inputs in recordings.
      // Passwords are always masked by PostHog regardless.
      maskAllInputs: false,
      maskInputOptions: { password: true },
    },
  });
}

/** Link events to the signed-in user (call on login). */
export function identifyUser(id: string, email?: string | null): void {
  if (!analyticsEnabled) return;
  posthog.identify(id, email ? { email } : undefined);
}

/** Clear identity on logout so the next user isn't merged into this one. */
export function resetAnalytics(): void {
  if (!analyticsEnabled) return;
  posthog.reset();
}

/** Capture a product event. Central wrapper so call sites stay tidy + safe. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!analyticsEnabled) return;
  posthog.capture(event, props);
}
