-- Public Storage bucket for challenge cover images uploaded from the Strapi
-- admin media library. Strapi's Supabase upload provider authenticates with the
-- service_role key (bypasses RLS on writes), and the public flag lets the app
-- render covers by their public URL:
--   https://<ref>.supabase.co/storage/v1/object/public/challenge-covers/<path>
insert into storage.buckets (id, name, public)
values ('challenge-covers', 'challenge-covers', true)
on conflict (id) do update set public = true;
