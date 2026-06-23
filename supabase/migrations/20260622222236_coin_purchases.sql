-- Coin-pack purchases made through Stripe. One row per completed Checkout
-- Session; the unique stripe_session_id gives the fulfillment webhook
-- idempotency (a duplicate delivery can't double-credit).

create table if not exists public.coin_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text unique not null,
  coins integer not null,
  amount_total integer,          -- minor units (grosze for PLN)
  currency text,
  created_at timestamptz not null default now()
);

create index if not exists coin_purchases_user_id_idx
  on public.coin_purchases (user_id);

alter table public.coin_purchases enable row level security;

-- Users may read their own purchase history. Inserts/updates happen only via the
-- service-role webhook (which bypasses RLS), so no write policy is defined.
drop policy if exists "own purchases readable" on public.coin_purchases;
create policy "own purchases readable" on public.coin_purchases
  for select
  using (auth.uid() = user_id);
