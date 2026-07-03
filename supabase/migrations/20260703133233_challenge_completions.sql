-- Reading-challenge completions. Challenges themselves are authored in Strapi
-- (the headless CMS); this table records the *grant* when a user's reading
-- sessions satisfy a challenge. The unique (user_id, challenge_id) gives the
-- evaluator idempotency (re-running the `challenges` edge function can't
-- double-credit), mirroring how coin_purchases uses stripe_session_id.
--
-- coin_reward / xp_reward are snapshotted at completion time, so later edits to
-- the challenge in Strapi never retro-change an already-granted reward.

create table if not exists public.challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id text not null,       -- Strapi documentId of the challenge
  title text,                       -- snapshot of the challenge title at grant time
  coin_reward integer not null default 0,
  xp_reward integer not null default 0,
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create index if not exists challenge_completions_user_id_idx
  on public.challenge_completions (user_id);

alter table public.challenge_completions enable row level security;

-- Users may read their own completions. Inserts happen only via the service-role
-- `challenges` edge function (which bypasses RLS), so no write policy is defined
-- — same posture as coin_purchases.
drop policy if exists "own completions readable" on public.challenge_completions;
create policy "own completions readable" on public.challenge_completions
  for select
  using (auth.uid() = user_id);
