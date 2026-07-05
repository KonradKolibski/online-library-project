-- Atomic, NaN-safe coin spending (and the streak-freeze side effects that go with
-- a shop purchase).
--
-- Coins are a derived balance (level + achievements + purchased + challenges −
-- spent); only `coinsSpent` is persisted, inside app_settings.data.progression.
-- The old client path did `coinsSpent + amount`, which produced NaN when a
-- partially-populated progression object had no `coinsSpent`, and it split a
-- purchase across several React state updates that a fire-and-forget blanket
-- upsert could persist inconsistently.
--
-- This RPC does the whole purchase as ONE locked read-modify-write on the caller's
-- own row:
--   coinsSpent      = coalesce(old, 0) + p_amount          (never NaN)
--   freezeInventory = max(0, coalesce(old, 0) + p_freeze_delta)
--   frozenDates    += p_frozen_date  (when given and not already present)
-- and returns the updated progression so the client can refresh its balance from
-- DB truth in a single state update.

-- Supersedes any earlier single-argument version.
drop function if exists public.spend_coins(integer);

create or replace function public.spend_coins(
  p_amount       integer,
  p_freeze_delta integer default 0,
  p_frozen_date  text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  prog      jsonb;
  new_spent numeric;
  new_inv   numeric;
  frozen    jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  -- Ensure a row exists so the lock + update below have something to hold.
  insert into public.app_settings (user_id, data)
  values (uid, '{}'::jsonb)
  on conflict (user_id) do nothing;

  -- Lock this user's row for an atomic read-modify-write.
  select coalesce(data -> 'progression', '{}'::jsonb)
    into prog
    from public.app_settings
   where user_id = uid
   for update;

  -- coalesce guarantees numbers even if the fields were absent/null → never NaN.
  new_spent := coalesce((prog ->> 'coinsSpent')::numeric, 0) + p_amount;
  new_inv   := greatest(
                 0,
                 coalesce((prog ->> 'freezeInventory')::numeric, 0)
                   + coalesce(p_freeze_delta, 0)
               );
  prog := jsonb_set(prog, '{coinsSpent}',      to_jsonb(new_spent), true);
  prog := jsonb_set(prog, '{freezeInventory}', to_jsonb(new_inv),   true);

  if p_frozen_date is not null then
    frozen := coalesce(prog -> 'frozenDates', '[]'::jsonb);
    if not (frozen @> to_jsonb(p_frozen_date)) then
      frozen := frozen || to_jsonb(p_frozen_date);
    end if;
    prog := jsonb_set(prog, '{frozenDates}', frozen, true);
  end if;

  update public.app_settings
     set data = jsonb_set(coalesce(data, '{}'::jsonb), '{progression}', prog, true),
         updated_at = now()
   where user_id = uid;

  return prog;
end;
$$;

-- Callable by signed-in users; the function scopes every write to auth.uid().
grant execute on function public.spend_coins(integer, integer, text) to authenticated;
