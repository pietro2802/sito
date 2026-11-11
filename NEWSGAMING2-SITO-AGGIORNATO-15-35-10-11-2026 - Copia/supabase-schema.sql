-- NEWSGAMING2 community schema
-- Run this script in Supabase SQL Editor. It is safe to re-run only after dropping/recreating
-- the tables; for an existing production database, apply the statements as a migration.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text not null,
  icon text not null default '🏆'
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, article_slug)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  status text not null default 'published' check (status in ('published','pending','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_article_idx on public.comments(article_slug, created_at desc);
create index if not exists comments_parent_idx on public.comments(parent_id);

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete set null,
  article_slug text,
  reason text not null check (reason in ('spam','offensive','misinformation','copyright','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  active boolean not null default true,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  platforms text[] not null default '{}',
  release_date date,
  genre text,
  cover_url text,
  trailer_url text,
  official_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_reviews (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 10),
  body text check (body is null or char_length(body) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','moderator','editor','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  user_id uuid references public.profiles(id) on delete set null,
  confirmation_token text unique,
  unsubscribe_token text unique,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers add column if not exists unsubscribe_token text unique;

create index if not exists newsletter_confirm_idx on public.newsletter_subscribers(confirmation_token);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public
stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin','editor','moderator')
  );
$$;

create or replace function public.is_admin_or_editor()
returns boolean language sql security definer set search_path = public
stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin','editor')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public
stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles(user_id, role) values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
drop trigger if exists comments_touch on public.comments;
create trigger comments_touch before update on public.comments for each row execute procedure public.touch_updated_at();
drop trigger if exists games_touch on public.games;
create trigger games_touch before update on public.games for each row execute procedure public.touch_updated_at();
drop trigger if exists reviews_touch on public.game_reviews;
create trigger reviews_touch before update on public.game_reviews for each row execute procedure public.touch_updated_at();

insert into public.badges(code,name,description,icon) values
('first-comment','Primo commento','Hai pubblicato il tuo primo commento.','💬'),
('critic','Critico','Hai pubblicato 10 commenti.','🎙️'),
('reader','Lettore','Hai salvato 5 articoli tra i preferiti.','📚'),
('voter','Votante','Hai partecipato a un sondaggio.','🗳️')
on conflict (code) do nothing;

alter table public.profiles enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.reports enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.games enable row level security;
alter table public.game_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.user_roles enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select using (true);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists badges_public_read on public.badges;
create policy badges_public_read on public.badges for select using (true);
drop policy if exists user_badges_public_read on public.user_badges;
create policy user_badges_public_read on public.user_badges for select using (true);

drop policy if exists favorites_self_all on public.favorites;
create policy favorites_self_all on public.favorites for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists comments_read_published on public.comments;
create policy comments_read_published on public.comments for select using (status='published' or auth.uid()=user_id or public.is_staff());
drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments for insert with check (auth.uid()=user_id);
drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments for update using (auth.uid()=user_id or public.is_staff()) with check (auth.uid()=user_id or public.is_staff());
drop policy if exists comments_delete_own_or_staff on public.comments;
create policy comments_delete_own_or_staff on public.comments for delete using (auth.uid()=user_id or public.is_staff());

drop policy if exists reactions_read on public.comment_reactions;
create policy reactions_read on public.comment_reactions for select using (true);
drop policy if exists reactions_own on public.comment_reactions;
create policy reactions_own on public.comment_reactions for insert with check (auth.uid()=user_id);
create policy reactions_delete_own on public.comment_reactions for delete using (auth.uid()=user_id);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert with check (auth.uid()=reporter_id);
drop policy if exists reports_read_own_staff on public.reports;
create policy reports_read_own_staff on public.reports for select using (auth.uid()=reporter_id or public.is_staff());
drop policy if exists reports_staff_update on public.reports;
create policy reports_staff_update on public.reports for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists polls_public_read on public.polls;
create policy polls_public_read on public.polls for select using (active=true or public.is_staff());
drop policy if exists polls_staff_write on public.polls;
create policy polls_staff_write on public.polls for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists poll_votes_own on public.poll_votes;
create policy poll_votes_own on public.poll_votes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists poll_votes_staff_read on public.poll_votes;
create policy poll_votes_staff_read on public.poll_votes for select using (public.is_staff());

drop policy if exists games_public_read on public.games;
create policy games_public_read on public.games for select using (true);
drop policy if exists games_staff_write on public.games;
create policy games_staff_write on public.games for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists reviews_public_read on public.game_reviews;
create policy reviews_public_read on public.game_reviews for select using (true);
drop policy if exists reviews_own_write on public.game_reviews;
create policy reviews_own_write on public.game_reviews for insert with check (auth.uid()=user_id);
create policy reviews_own_update on public.game_reviews for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select using (auth.uid()=user_id);
create policy notifications_update_own on public.notifications for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists roles_staff_read on public.user_roles;
create policy roles_staff_read on public.user_roles for select using (auth.uid()=user_id or public.is_staff());
drop policy if exists roles_admin_write on public.user_roles;
create policy roles_admin_write on public.user_roles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists newsletter_insert on public.newsletter_subscribers;
create policy newsletter_insert on public.newsletter_subscribers for insert with check (true);
drop policy if exists newsletter_staff_read on public.newsletter_subscribers;
create policy newsletter_staff_read on public.newsletter_subscribers for select using (public.is_staff());

-- XP helpers
create or replace function public.award_xp(p_user uuid, p_amount integer)
returns void language sql security definer set search_path=public as $$
  update public.profiles set xp=xp+greatest(p_amount,0) where id=p_user;
$$;

create or replace function public.sync_basic_badges()
returns trigger language plpgsql security definer set search_path=public
as $$
declare c integer;
begin
  select count(*) into c from public.comments where user_id=new.user_id and status='published';
  if c >= 1 then
    insert into public.user_badges(user_id,badge_id) select new.user_id,id from public.badges where code='first-comment' on conflict do nothing;
  end if;
  if c >= 10 then
    insert into public.user_badges(user_id,badge_id) select new.user_id,id from public.badges where code='critic' on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_badges on public.comments;
create trigger comments_badges after insert on public.comments for each row execute procedure public.sync_basic_badges();


create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text not null,
  category text not null default 'News',
  platforms text[] not null default '{}',
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.articles enable row level security;
drop policy if exists articles_public_published on public.articles;
create policy articles_public_published on public.articles for select using (status='published' or auth.uid()=author_id or public.is_staff());
drop policy if exists articles_staff_insert on public.articles;
create policy articles_staff_insert on public.articles for insert with check (public.is_staff() and auth.uid()=author_id);
drop policy if exists articles_staff_update on public.articles;
create policy articles_staff_update on public.articles for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists articles_staff_delete on public.articles;
create policy articles_staff_delete on public.articles for delete using (public.is_staff());
drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles for each row execute procedure public.touch_updated_at();

-- === XP / STREAK / GAMIFICATION (migration-safe) ===
alter table public.profiles add column if not exists daily_streak integer not null default 0 check (daily_streak >= 0);
alter table public.profiles add column if not exists last_login_date date;

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  event_key text not null,
  xp integer not null check (xp > 0),
  reason text,
  created_at timestamptz not null default now(),
  unique(user_id,event_type,event_key)
);
create index if not exists xp_events_user_idx on public.xp_events(user_id,created_at desc);

alter table public.xp_events enable row level security;
drop policy if exists xp_events_self_read on public.xp_events;
create policy xp_events_self_read on public.xp_events for select using (auth.uid()=user_id or public.is_staff());

create or replace function public.award_xp(p_user_id uuid,p_xp integer,p_event_type text,p_event_key text,p_reason text default null)
returns boolean language plpgsql security definer set search_path=public
as $$
declare inserted_count integer;
begin
  if p_xp <= 0 then return false; end if;
  insert into public.xp_events(user_id,event_type,event_key,xp,reason)
  values(p_user_id,p_event_type,p_event_key,p_xp,p_reason)
  on conflict(user_id,event_type,event_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;
  perform set_config('ng2.xp_award','1',true);
  update public.profiles set xp=xp+p_xp where id=p_user_id;
  perform set_config('ng2.xp_award','0',true);
  return true;
end;
$$;

create or replace function public.claim_daily_login()
returns table(xp_awarded integer,streak integer,total_xp integer)
language plpgsql security definer set search_path=public
as $$
declare p public.profiles%rowtype; today date:=current_date; new_streak integer; reward integer; inserted_count integer;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null then return; end if;
  if p.last_login_date=today then
    xp_awarded:=0; streak:=p.daily_streak; total_xp:=p.xp; return next; return;
  end if;
  if p.last_login_date=today-1 then new_streak:=p.daily_streak+1; else new_streak:=1; end if;
  reward:=least(10+(new_streak-1)*5,40);
  if new_streak=7 then reward:=reward+50; end if;
  insert into public.xp_events(user_id,event_type,event_key,xp,reason)
  values(auth.uid(),'daily_login',to_char(today,'YYYY-MM-DD'),reward,'Accesso giornaliero')
  on conflict(user_id,event_type,event_key) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=0 then
    xp_awarded:=0; streak:=p.daily_streak; total_xp:=p.xp; return next; return;
  end if;
  perform set_config('ng2.xp_award','1',true);
  update public.profiles set xp=xp+reward,daily_streak=new_streak,last_login_date=today where id=auth.uid() returning xp,daily_streak into total_xp,streak;
  perform set_config('ng2.xp_award','0',true);
  xp_awarded:=reward; return next;
end;
$$;

drop function if exists public.award_comment_xp();
create or replace function public.award_comment_xp()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  perform public.award_xp(new.user_id,15,'comment',new.id::text,'Commento pubblicato');
  return new;
end;
$$;
drop trigger if exists comments_xp on public.comments;
create trigger comments_xp after insert on public.comments for each row execute procedure public.award_comment_xp();

drop function if exists public.award_favorite_xp();
create or replace function public.award_favorite_xp()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  perform public.award_xp(new.user_id,5,'favorite',new.article_slug,'Articolo salvato');
  return new;
end;
$$;
drop trigger if exists favorites_xp on public.favorites;
create trigger favorites_xp after insert on public.favorites for each row execute procedure public.award_favorite_xp();

drop function if exists public.award_poll_xp();
create or replace function public.award_poll_xp()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  perform public.award_xp(new.user_id,10,'poll',new.poll_id::text,'Voto al sondaggio');
  return new;
end;
$$;
drop trigger if exists poll_votes_xp on public.poll_votes;
create trigger poll_votes_xp after insert on public.poll_votes for each row execute procedure public.award_poll_xp();

-- Protegge XP e streak da modifiche arbitrarie dal client.
create or replace function public.protect_profile_progress()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid()=old.id and not public.is_staff() and coalesce(current_setting('ng2.xp_award',true),'0') <> '1' then
    new.xp:=old.xp; new.daily_streak:=old.daily_streak; new.last_login_date:=old.last_login_date;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_progress_guard on public.profiles;
create trigger profiles_progress_guard before update on public.profiles for each row execute procedure public.protect_profile_progress();

-- Vista utile alla classifica senza esporre dati sensibili.
drop view if exists public.leaderboard;
create view public.leaderboard as
select id,display_name,username,avatar_url,xp,daily_streak from public.profiles order by xp desc;

-- Ricarica la cache API di PostgREST dopo la migrazione.
notify pgrst,'reload schema';

-- Calendario iniziale verificato il 10/11/2026. Le date non confermate restano NULL.
insert into public.games(slug,title,description,platforms,release_date,genre,official_url,featured) values
('gta-6','Grand Theft Auto VI','Data di uscita indicata da PlayStation: 19 novembre 2026.','{"PS5","Xbox Series X|S"}','2026-11-19','Azione / Open world','https://www.playstation.com/it-it/ps5/games/',true),
('metaphor-refantazio-switch2','Metaphor: ReFantazio','Versione Nintendo Switch 2 indicata da Nintendo per il 12 novembre 2026.','{"Nintendo Switch 2"}','2026-11-12','RPG','https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html',true),
('pikmin-4-switch2','Pikmin 4 – Nintendo Switch 2 Edition + Accademia Dandori','Versione Nintendo Switch 2 indicata da Nintendo per il 12 novembre 2026.','{"Nintendo Switch 2"}','2026-11-12','Strategia / Avventura','https://www.nintendo.com/it-it/Notizie/2026/Novembre/Giochi-in-arrivo-Novembre-2026-3229019.html',false),
('sonic-pico-park','SONIC PICO PARK','Nintendo indica l’uscita per il 12 novembre 2026 su Switch 2 e Switch.','{"Nintendo Switch 2","Nintendo Switch"}','2026-11-12','Party / Co-op','https://www.nintendo.com/it-it/Notizie/2026/Novembre/Giochi-in-arrivo-Novembre-2026-3229019.html',false),
('binding-of-isaac-repentance-plus','The Binding of Isaac: Repentance+','Uscita Nintendo Switch 2 indicata da Nintendo per il 19 novembre 2026.','{"Nintendo Switch 2"}','2026-11-19','Roguelike','https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html',false),
('rayman-legends-retold','Rayman Legends Retold','Rivisitazione indicata da Nintendo per il 3 dicembre 2026 su Switch 2.','{"Nintendo Switch 2"}','2026-12-03','Platform','https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html',false),
('layton-new-world-steam','Il professor Layton e il Nuovo Mondo a vapore','Nuovo capitolo della serie Layton indicato da Nintendo per il 10 dicembre 2026 su Switch.','{"Nintendo Switch"}','2026-12-10','Avventura / Puzzle','https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html',true),
('until-dawn-2','Until Dawn 2','Data indicata da PlayStation: 28 gennaio 2027.','{"PS5"}','2027-01-28','Horror / Avventura','https://www.playstation.com/it-it/ps5/games/',true),
('forza-horizon-6','Forza Horizon 6','Data indicata da PlayStation: 26 gennaio 2027.','{"PS5"}','2027-01-26','Corse','https://www.playstation.com/it-it/ps5/games/',true),
('god-of-war-laufey','God of War: Laufey','Data indicata da PlayStation: 16 febbraio 2027.','{"PS5"}','2027-02-16','Azione / Avventura','https://www.playstation.com/it-it/ps5/games/',true)
on conflict (slug) do update set title=excluded.title,description=excluded.description,platforms=excluded.platforms,release_date=excluded.release_date,genre=excluded.genre,official_url=excluded.official_url,featured=excluded.featured,updated_at=now();

insert into public.polls(question,options,active)
select 'Quale piattaforma segui di più su NEWSGAMING2?', '["PlayStation","Xbox","Nintendo","PC","Mobile"]'::jsonb, true
where not exists (select 1 from public.polls where active=true);

-- === NG2 PRODUCTION SAFETY / REWARDS ===
-- Grants are required for browser RPC calls. RLS still protects table access.
grant execute on function public.claim_daily_login() to authenticated;
grant execute on function public.award_xp(uuid,integer,text,text,text) to authenticated;

-- Milestone rewards are deterministic and cannot be claimed twice because xp_events.event_key is unique per user.
create or replace function public.claim_daily_login()
returns table(xp_awarded integer,streak integer,total_xp integer)
language plpgsql security definer set search_path=public
as $$
declare p public.profiles%rowtype; today date:=current_date; new_streak integer; reward integer; bonus integer:=0; inserted_count integer;
begin
  if auth.uid() is null then return; end if;
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null then return; end if;
  if p.last_login_date=today then xp_awarded:=0; streak:=p.daily_streak; total_xp:=p.xp; return next; return; end if;
  if p.last_login_date=today-1 then new_streak:=p.daily_streak+1; else new_streak:=1; end if;
  reward:=least(10+(new_streak-1)*5,40);
  if new_streak=7 then bonus:=50; elsif new_streak=14 then bonus:=100; elsif new_streak=30 then bonus:=250; end if;
  reward:=reward+bonus;
  insert into public.xp_events(user_id,event_type,event_key,xp,reason) values(auth.uid(),'daily_login',to_char(today,'YYYY-MM-DD'),reward,case when bonus>0 then 'Accesso giornaliero + bonus streak' else 'Accesso giornaliero' end) on conflict(user_id,event_type,event_key) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=0 then xp_awarded:=0; streak:=p.daily_streak; total_xp:=p.xp; return next; return; end if;
  perform set_config('ng2.xp_award','1',true);
  update public.profiles set xp=xp+reward,daily_streak=new_streak,last_login_date=today where id=auth.uid() returning xp,daily_streak into total_xp,streak;
  perform set_config('ng2.xp_award','0',true);
  xp_awarded:=reward; return next;
end;$$;

-- Public leaderboard fields; email/password are never exposed.
drop view if exists public.leaderboard;
create view public.leaderboard as
select id,display_name,username,avatar_url,xp,daily_streak,(floor(xp/100)+1)::integer as level,(xp%100)::integer as progress
from public.profiles order by xp desc;

grant select on public.leaderboard to anon,authenticated;
notify pgrst,'reload schema';
