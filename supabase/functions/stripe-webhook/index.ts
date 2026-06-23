// Supabase Edge Function: stripe-webhook
//
// Fulfills coin-pack purchases made through Stripe Payment Links. Stripe calls
// this endpoint (no Supabase JWT — verify_jwt = false in config.toml), so we
// authenticate by verifying the Stripe signature instead.
//
// Flow on `checkout.session.completed`:
//   1. user_id = session.client_reference_id (set by the app on the link URL).
//   2. Look up the purchased product(s) via listLineItems and map product id →
//      coins with PRODUCT_COINS (the products carry no `coins` metadata).
//   3. Idempotently insert into `coin_purchases` (unique stripe_session_id) —
//      a duplicate delivery is a no-op.
//   4. Recompute SUM(coins) for the user and mirror it into
//      app_settings.data.progression.coinsPurchased (the value the client reads).
//
// Secrets (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY      — to call listLineItems
//   STRIPE_WEBHOOK_SECRET  — to verify the request signature

import Stripe from "npm:stripe@^17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Authoritative product → coins map (products have no `coins` metadata).
const PRODUCT_COINS: Record<string, number> = {
  prod_UkgEH4IXVF9Uci: 100, // Handful
  prod_UkgG7gkXcKfRVU: 250, // Pouch
  prod_UkgGBa5zWZnZkX: 600, // Sack
  prod_UkgHnqXue8eGlo: 1500, // Chest
  prod_UkgIEKldagltlt: 3500, // Vault
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return json(
      { error: "Server is missing STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET." },
      500,
    );
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Verify the signature against the raw body (async variant required in Deno).
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing stripe-signature header." }, 400);
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return json({ error: "Invalid signature." }, 400);
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge other events so Stripe doesn't retry them.
    return json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.client_reference_id;
  if (!userId) {
    console.error("[stripe-webhook] session has no client_reference_id:", session.id);
    return json({ received: true }); // nothing we can credit; don't retry
  }

  // Resolve coins from the purchased line items.
  let coins = 0;
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
      limit: 100,
    });
    for (const item of lineItems.data) {
      const product = item.price?.product as Stripe.Product | undefined;
      const perUnit = product ? PRODUCT_COINS[product.id] ?? 0 : 0;
      coins += perUnit * (item.quantity ?? 1);
    }
  } catch (err) {
    console.error("[stripe-webhook] listLineItems failed:", err);
    return json({ error: "Could not read line items." }, 500);
  }

  if (coins <= 0) {
    console.error("[stripe-webhook] no creditable coins for session:", session.id);
    return json({ received: true });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotent insert: a unique stripe_session_id makes duplicate deliveries no-ops.
  const { error: insErr } = await admin.from("coin_purchases").insert({
    user_id: userId,
    stripe_session_id: session.id,
    coins,
    amount_total: session.amount_total,
    currency: session.currency,
  });
  if (insErr) {
    // 23505 = unique_violation → already processed; ack without re-crediting.
    if ((insErr as { code?: string }).code === "23505") {
      return json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] coin_purchases insert failed:", insErr);
    return json({ error: "Insert failed." }, 500);
  }

  // Recompute the user's purchased total (convergent — safe under retries).
  const { data: rows, error: sumErr } = await admin
    .from("coin_purchases")
    .select("coins")
    .eq("user_id", userId);
  if (sumErr) {
    console.error("[stripe-webhook] sum query failed:", sumErr);
    return json({ error: "Sum failed." }, 500);
  }
  const totalPurchased = (rows ?? []).reduce((acc, r) => acc + (r.coins ?? 0), 0);

  // Mirror the total into app_settings.data.progression.coinsPurchased, preserving
  // the rest of the settings JSON.
  const { data: settingsRow, error: readErr } = await admin
    .from("app_settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) {
    console.error("[stripe-webhook] settings read failed:", readErr);
    return json({ error: "Settings read failed." }, 500);
  }

  const data = (settingsRow?.data as Record<string, unknown> | null) ?? {};
  const progression = (data.progression as Record<string, unknown> | undefined) ?? {};
  const nextData = {
    ...data,
    progression: { ...progression, coinsPurchased: totalPurchased },
  };

  const { error: upErr } = await admin
    .from("app_settings")
    .upsert({
      user_id: userId,
      data: nextData,
      updated_at: new Date().toISOString(),
    });
  if (upErr) {
    console.error("[stripe-webhook] settings upsert failed:", upErr);
    return json({ error: "Settings upsert failed." }, 500);
  }

  return json({ received: true, credited: coins, total: totalPurchased });
});
