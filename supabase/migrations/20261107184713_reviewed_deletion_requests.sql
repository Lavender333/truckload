-- Customer actions create requests only. Existing backup data is preserved.
revoke delete on public.driver_backups from authenticated;
drop policy if exists own_backup_delete on public.driver_backups;
create table public.deletion_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 scope text not null check(scope in ('account','backup')),
 status text not null default 'received' check(status in ('received','in_review','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision bigint not null default 1,
 review_note text not null default '' check(length(review_note)<=2000),
 reviewed_by uuid references auth.users(id) on delete restrict
);
create unique index one_open_deletion_request on public.deletion_requests(user_id,scope) where status <> 'closed';
alter table public.deletion_requests enable row level security;
revoke all on public.deletion_requests from anon,authenticated;
grant select on public.deletion_requests to authenticated;
grant all on public.deletion_requests to service_role;
create policy own_request_read on public.deletion_requests for select to authenticated using ((select auth.uid())=user_id);
create table public.deletion_request_events (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.deletion_requests(id) on delete restrict,
 actor_id uuid references auth.users(id) on delete restrict,
 status text not null,
 note text not null,
 created_at timestamptz not null default now()
);
alter table public.deletion_request_events enable row level security;
revoke all on public.deletion_request_events from anon,authenticated;
grant select,insert on public.deletion_request_events to service_role;
create function public.audit_deletion_request() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.deletion_request_events(request_id,actor_id,status,note)
 values(new.id,new.reviewed_by,new.status,new.review_note);
 return new;
end; $$;
revoke all on function public.audit_deletion_request() from public,anon,authenticated;
-- AFTER insert ensures the event foreign key sees the request; updates stamp first.
create function public.stamp_deletion_request() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at:=now();new.revision:=old.revision+1;return new;end; $$;
revoke all on function public.stamp_deletion_request() from public,anon,authenticated;
create trigger stamp_deletion_request before update on public.deletion_requests for each row execute function public.stamp_deletion_request();
create trigger audit_deletion_request after insert or update on public.deletion_requests for each row execute function public.audit_deletion_request();
create index deletion_requests_reviewer_idx on public.deletion_requests(reviewed_by);
create index deletion_events_request_idx on public.deletion_request_events(request_id);
create index deletion_events_actor_idx on public.deletion_request_events(actor_id);
create index deletion_requests_user_idx on public.deletion_requests(user_id);
