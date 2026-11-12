-- Tabelle private per invii newsletter e link di disiscrizione individuali.
create table if not exists public.newsletter_article_notifications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  article_url text not null,
  status text not null default 'processing'
    check (status in ('processing', 'sent', 'failed')),
  delivered_count integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.newsletter_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists newsletter_unsubscribe_tokens_subscriber_idx
  on public.newsletter_unsubscribe_tokens (subscriber_id);

alter table public.newsletter_article_notifications enable row level security;
alter table public.newsletter_unsubscribe_tokens enable row level security;

-- Nessuna policy pubblica: le API Vercel accedono con la chiave server segreta.
