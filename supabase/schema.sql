begin;

drop trigger if exists create_playbook_profile on auth.users;
drop function if exists public.create_profile();

create table if not exists public.usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.plays (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 100),
  board jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.plays add column if not exists is_public boolean not null default false;

create table if not exists public.play_votes (
  play_id uuid not null references public.plays(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (play_id, user_id)
);

alter table public.usernames enable row level security;
alter table public.plays enable row level security;
alter table public.play_votes enable row level security;

drop policy if exists "Read own or team plays" on public.plays;
drop policy if exists "Create own plays in joined teams" on public.plays;
drop policy if exists "Edit own plays" on public.plays;
drop policy if exists "Delete own plays" on public.plays;
drop policy if exists "View plays" on public.plays;
drop policy if exists "Create plays" on public.plays;
drop policy if exists "Update plays" on public.plays;
drop policy if exists "Delete plays" on public.plays;

alter table public.plays drop column if exists team_id;
drop table if exists public.team_members;
drop table if exists public.teams;
drop function if exists public.join_team(uuid);
drop function if exists public.is_team_member(uuid);
drop table if exists public.profiles;

create index if not exists plays_owner_id_idx on public.plays(owner_id);

create policy "View plays" on public.plays for select to anon, authenticated
using (is_public or owner_id = (select auth.uid()));
create policy "Create plays" on public.plays for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy "Update plays" on public.plays for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Delete plays" on public.plays for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Read usernames" on public.usernames;
create policy "Read usernames" on public.usernames for select to anon, authenticated using (true);

drop policy if exists "Read own votes" on public.play_votes;
drop policy if exists "Upvote public plays" on public.play_votes;
drop policy if exists "Remove own votes" on public.play_votes;
create policy "Read own votes" on public.play_votes for select to authenticated
using (user_id = (select auth.uid()));
create policy "Upvote public plays" on public.play_votes for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.plays where id = play_id and is_public
));
create policy "Remove own votes" on public.play_votes for delete to authenticated
using (user_id = (select auth.uid()));

insert into public.usernames(user_id, username)
select id, 'player_' || left(replace(id::text, '-', ''), 17) from auth.users
on conflict (user_id) do nothing;

create or replace function public.create_username() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  chosen_name text;
begin
  chosen_name := lower(trim(new.raw_user_meta_data->>'username'));
  if chosen_name is null or chosen_name !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Choose a username with 3 to 24 letters, numbers or underscores';
  end if;
  insert into public.usernames(user_id, username) values (new.id, chosen_name);
  return new;
end;
$$;

drop trigger if exists create_playbook_username on auth.users;
create trigger create_playbook_username after insert on auth.users
for each row execute function public.create_username();

create or replace function public.play_vote_count(play uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.play_votes
  where play_id = play and exists (
    select 1 from public.plays where id = play and is_public
  );
$$;

create or replace view public.shared_plays with (security_invoker = true) as
select plays.id, plays.owner_id, plays.title, plays.board, plays.updated_at,
  usernames.username, public.play_vote_count(plays.id) as upvotes
from public.plays
join public.usernames on usernames.user_id = plays.owner_id
where plays.is_public;

revoke all on function public.create_username() from public;
revoke all on function public.play_vote_count(uuid) from public;
grant execute on function public.play_vote_count(uuid) to anon, authenticated;
revoke all on public.usernames from anon, authenticated;
grant select on public.usernames to anon, authenticated;
revoke all on public.play_votes from anon, authenticated;
grant select, insert, delete on public.play_votes to authenticated;
grant select on public.shared_plays to anon, authenticated;
grant select on public.plays to anon;
grant select, insert, update, delete on public.plays to authenticated;

notify pgrst, 'reload schema';

commit;
