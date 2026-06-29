-- Semantic + full-text search over reading sessions, plus owner-only RLS for
-- the reading_sessions and books tables. Exported from the live Supabase
-- project (capy-books) to keep the repo migrations authoritative.

-- pgvector powers the semantic (embedding) side of the hybrid search.
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Embedding scheme on reading_sessions
-- ---------------------------------------------------------------------------
-- embedding: OpenAI-style 1536-dim vector, populated out of band (nullable).
-- fts:       generated tsvector over notes + quote, kept in sync automatically.
alter table public.reading_sessions
  add column if not exists embedding vector(1536);

alter table public.reading_sessions
  add column if not exists fts tsvector
  generated always as (
    to_tsvector('english', coalesce(notes, '') || ' ' || coalesce(quote, ''))
  ) stored;

-- IVFFlat index for cosine nearest-neighbour over the embeddings.
create index if not exists reading_sessions_embedding_idx
  on public.reading_sessions
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- GIN index backing the full-text side of the search.
create index if not exists reading_sessions_fts_idx
  on public.reading_sessions
  using gin (fts);

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only access
-- ---------------------------------------------------------------------------
alter table public.reading_sessions enable row level security;
alter table public.books enable row level security;

-- A user may do anything with their own rows, and only their own rows.
drop policy if exists reading_sessions_owner on public.reading_sessions;
create policy reading_sessions_owner on public.reading_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists books_owner on public.books;
create policy books_owner on public.books
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- hybrid_search_sessions: Reciprocal Rank Fusion over full-text + semantic
-- ---------------------------------------------------------------------------
-- Combines a websearch full-text ranking and a cosine-distance semantic
-- ranking via RRF, then folds in the most recent sessions so freshly logged
-- entries always surface. Scoped to a single user via p_user_id (callers run
-- with RLS, but the explicit filter keeps the CTEs correct and indexable).
create or replace function public.hybrid_search_sessions(
  p_user_id uuid,
  query_text text,
  query_embedding vector,
  match_count integer default 30,
  candidates integer default 30,
  full_text_weight double precision default 1.0,
  semantic_weight double precision default 1.0,
  rrf_k integer default 50,
  recent_days integer default 7,
  recent_limit integer default 7
)
returns table(
  id text,
  date date,
  minutes integer,
  mood text,
  notes text,
  quote text,
  quote_page integer,
  created_at timestamp with time zone,
  score double precision,
  is_recent boolean
)
language sql
stable
set search_path to 'public'
as $function$
WITH full_text AS (
  SELECT rs.id,
         row_number() OVER (
           ORDER BY ts_rank_cd(rs.fts, websearch_to_tsquery('english', query_text)) DESC
         ) AS rank_ix
  FROM reading_sessions rs
  WHERE rs.user_id = p_user_id
    AND query_text <> ''
    AND rs.fts @@ websearch_to_tsquery('english', query_text)
  ORDER BY rank_ix
  LIMIT candidates
),
semantic AS (
  SELECT rs.id,
         row_number() OVER (ORDER BY rs.embedding <=> query_embedding) AS rank_ix
  FROM reading_sessions rs
  WHERE rs.user_id = p_user_id
    AND rs.embedding IS NOT NULL
  ORDER BY rank_ix
  LIMIT candidates
),
fused AS (
  SELECT coalesce(full_text.id, semantic.id) AS id,
         ( coalesce(1.0/(rrf_k + full_text.rank_ix), 0.0) * full_text_weight
         + coalesce(1.0/(rrf_k + semantic.rank_ix),  0.0) * semantic_weight ) AS score
  FROM full_text
  FULL OUTER JOIN semantic ON full_text.id = semantic.id
  ORDER BY score DESC
  LIMIT match_count
),
recent AS (
  SELECT rs.id
  FROM reading_sessions rs
  WHERE rs.user_id = p_user_id
    AND rs.date >= current_date - make_interval(days => recent_days)
  ORDER BY rs.date DESC, rs.created_at DESC
  LIMIT recent_limit
),
combined AS (
  SELECT id, max(score) AS score, bool_or(is_recent) AS is_recent
  FROM (
    SELECT id, score, false AS is_recent FROM fused
    UNION ALL
    SELECT id, 0::float AS score, true AS is_recent FROM recent
  ) u
  GROUP BY id
)
SELECT rs.id, rs.date, rs.minutes, rs.mood,
       rs.notes, rs.quote, rs.quote_page, rs.created_at,
       c.score, c.is_recent
FROM combined c
JOIN reading_sessions rs ON rs.id = c.id
WHERE rs.user_id = p_user_id
ORDER BY c.is_recent DESC, c.score DESC, rs.date DESC;
$function$;
