-- Allinea lo schema newsletter alle API attuali senza eliminare iscritti.
-- I token legacy vengono trasformati in hash prima di svuotare i campi in chiaro.
create extension if not exists pgcrypto;

alter table public.newsletter_subscribers
  add column if not exists confirmation_token_hash text,
  add column if not exists unsubscribe_token_hash text,
  add column if not exists status text,
  add column if not exists consent_at timestamptz;

update public.newsletter_subscribers
set confirmation_token_hash = encode(digest(confirmation_token, 'sha256'), 'hex')
where confirmation_token is not null
  and confirmation_token_hash is null;

update public.newsletter_subscribers
set unsubscribe_token_hash = encode(digest(unsubscribe_token, 'sha256'), 'hex')
where unsubscribe_token is not null
  and unsubscribe_token_hash is null;

update public.newsletter_subscribers
set status = case
  when unsubscribed_at is not null
       and (confirmed_at is null or unsubscribed_at >= confirmed_at) then 'unsubscribed'
  when confirmed_at is not null then 'confirmed'
  else 'pending'
end
where status is null;

-- Non si inventa una data di consenso per i record storici: resta NULL se non registrata.
alter table public.newsletter_subscribers
  alter column status set default 'pending',
  alter column status set not null;

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_status_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_status_check
  check (status in ('pending', 'confirmed', 'unsubscribed'));

update public.newsletter_subscribers
set confirmation_token = null
where confirmation_token_hash is not null;

update public.newsletter_subscribers
set unsubscribe_token = null
where unsubscribe_token_hash is not null;

create unique index if not exists newsletter_confirmation_token_hash_uidx
  on public.newsletter_subscribers (confirmation_token_hash)
  where confirmation_token_hash is not null;

create unique index if not exists newsletter_unsubscribe_token_hash_uidx
  on public.newsletter_subscribers (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status);
