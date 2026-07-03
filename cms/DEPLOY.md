# Deploying the CMS (Strapi) to Railway

This folder is a standalone Strapi 5 app that hosts **Reading Challenges**. It is
deployed as its own Railway service with a Railway Postgres database. The app's
`challenges` Supabase Edge Function reads challenge definitions from it.

Run everything below from **this `cms/` folder** unless noted.

## 0. One-time: log in

```bash
railway login          # opens a browser to pair the CLI
```

## 1. Create the project + Postgres

```bash
railway init                       # create a new project (give it a name, e.g. capy-cms)
railway add --database postgres     # provision a Postgres database in the project
```

## 2. Set Strapi secrets + config

Generate strong secrets and push them to the service. The helper script does this
for you (it prints what it sets, secrets included — keep that output private):

```bash
bash scripts/railway-secrets.sh
```

That sets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`,
`ENCRYPTION_KEY`, `JWT_SECRET`, plus `NODE_ENV=production`, `HOST=0.0.0.0`,
`DATABASE_CLIENT=postgres`, `DATABASE_SSL=false`.

**Point Strapi at the database.** In the Railway dashboard, open the Strapi
service → **Variables** → add a reference variable:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

(Referencing the Postgres service's URL is a one-click "Add Reference" in the
dashboard; doing it by hand via CLI is error-prone, so use the UI for this one.)

## 3. Deploy

```bash
railway up            # build (Nixpacks runs `npm run build`) + deploy
railway domain        # generate a public URL, e.g. https://capy-cms-production.up.railway.app
```

Nixpacks detects Node, installs deps, runs `strapi build`, then `npm run start`.
On first boot, `src/index.ts` seeds two example challenges.

## 4. Create the admin user + a read-only API token

```bash
# Create the first admin (non-interactive):
railway run npx strapi admin:create-user \
  --email you@example.com --password 'ChangeMe123!' --firstname You
```

Then open `https://<your-domain>/admin`, log in, and go to
**Settings → API Tokens → Create new API Token**:

- Name: `edge-function-read`
- Token type: **Read-only**
- Duration: Unlimited

Copy the token (shown once).

## 5. Wire the CMS into the app (Supabase secrets)

From the **repo root** (not `cms/`):

```bash
supabase secrets set STRAPI_URL=https://<your-domain>.up.railway.app
supabase secrets set STRAPI_API_TOKEN=<the read-only token from step 4>
supabase functions deploy challenges
```

Also apply the completions migration if it isn't live yet:

```bash
supabase db push        # applies supabase/migrations/*_challenge_completions.sql
```

That's it — the app's Home page will now show published challenges with live
progress, and completions grant coins/XP server-side.

## Authoring challenges

In `https://<your-domain>/admin` → **Content Manager → Challenge → Create**:

- **goalType**: `days_logged`, `books_finished`, `pages_read`, `minutes_read`, or
  `distinct_genres`
- **target**: the number to reach (e.g. 10)
- **startDate / endDate**: the active window (progress only counts sessions in it)
- **xpReward / coinReward**: granted once, when a user's sessions meet the target
- **coverUrl**: optional image URL (no file upload needed)

Remember to **Publish** — drafts are not returned to the app.

## Notes

- Railway's filesystem is ephemeral; that's why challenge covers use a `coverUrl`
  string instead of an uploaded media field. Add an S3/Cloudinary upload provider
  later if you want managed media.
- Content types are defined in code (`src/api/challenge/...`), so they deploy with
  the service — you do **not** create them by clicking in the admin.
