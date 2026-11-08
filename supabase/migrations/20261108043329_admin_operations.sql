-- Private operations tables: never expose staff notes or message contents to drivers.
create table public.request_staff (
 request_id uuid primary key references public.deletion_requests(id),
 assigned_owner text not null default '', internal_note text not null default '' check(length(internal_note)<=4000)
);
create table public.support_messages (
 id uuid primary key, email text not null, topic text not null, message text not null check(length(message) between 1 and 2000),
 created_at timestamptz not null default now(), status text not null default 'received' check(status in ('received','in_review','closed')),
 assigned_owner text not null default '', internal_note text not null default '' check(length(internal_note)<=4000),
 customer_update text not null default '' check(length(customer_update)<=2000), revision bigint not null default 1,
 email_delivery text not null default 'pending' check(email_delivery in ('pending','accepted','failed'))
);
create table public.admin_activity (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null, item_id uuid not null,
 kind text not null, details jsonb not null, created_at timestamptz not null default now()
);
create table public.service_events (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('email_request_failed','backup_failed')),
 created_at timestamptz not null default now()
);
create table public.ingestion_limits (bucket text primary key, starts_at timestamptz not null default now(), hits int not null default 1);
create index support_messages_created_idx on public.support_messages(created_at);
create index admin_activity_created_idx on public.admin_activity(created_at desc);
create index service_events_created_idx on public.service_events(created_at);
alter table public.request_staff enable row level security;
alter table public.support_messages enable row level security;
alter table public.admin_activity enable row level security;
alter table public.service_events enable row level security;
alter table public.ingestion_limits enable row level security;
revoke all on public.request_staff,public.support_messages,public.admin_activity,public.service_events,public.ingestion_limits from anon,authenticated;
grant all on public.request_staff,public.support_messages,public.service_events,public.ingestion_limits to service_role;
grant select,insert on public.admin_activity to service_role;

grant select on public.driver_backups to service_role;
grant select(id,email,email_confirmed_at,is_anonymous,created_at,last_sign_in_at) on auth.users to service_role;

-- Service-role only; callers must be authorized by the Edge Function before invoking.
create function public.operations_rate_limit(p_bucket text) returns boolean language plpgsql security invoker set search_path='' as $$
declare n int;
begin
 insert into public.ingestion_limits(bucket) values(p_bucket) on conflict(bucket) do update
 set hits=case when ingestion_limits.starts_at<now()-interval '1 hour' then 1 else ingestion_limits.hits+1 end,
 starts_at=case when ingestion_limits.starts_at<now()-interval '1 hour' then now() else ingestion_limits.starts_at end
 returning hits into n;
 return n<=20;
end;$$;
create function public.admin_overview(p_search text default '',p_offset int default 0) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object(
 'driverCount',(select count(*) from auth.users where email_confirmed_at is not null and not coalesce(is_anonymous,false)),
 'newDrivers',(select count(*) from auth.users where email_confirmed_at is not null and created_at>=now()-interval '30 days' and not coalesce(is_anonymous,false)),
 'backupCount',(select count(*) from public.driver_backups),
 'pendingRequests',(select count(*) from public.deletion_requests where status<>'closed'),
 'pendingSupport',(select count(*) from public.support_messages where status<>'closed'),
 'driverTotal',(select count(*) from auth.users where email_confirmed_at is not null and not coalesce(is_anonymous,false) and position(lower(p_search) in lower(email))>0),
 'drivers',coalesce((select jsonb_agg(d) from (select u.id,u.email,u.created_at,u.last_sign_in_at,b.saved_at from auth.users u left join public.driver_backups b on b.user_id=u.id where u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and position(lower(p_search) in lower(u.email))>0 order by u.created_at desc,u.id limit 50 offset greatest(p_offset,0)) d),'[]'::jsonb),
 'health',jsonb_build_object('emailFailures24h',(select count(*) from public.service_events where kind='email_request_failed' and created_at>now()-interval '24 hours'),'backupFailures24h',(select count(*) from public.service_events where kind='backup_failed' and created_at>now()-interval '24 hours'),'supportEmailFailures',(select count(*) from public.support_messages where email_delivery='failed')),
 'checkedAt',now());
$$;
create function public.review_operation(p_actor uuid,p_kind text,p_id uuid,p_revision bigint,p_status text,p_note text,p_owner text,p_internal text) returns boolean language plpgsql security invoker set search_path='' as $$
declare changed uuid;
begin
 if p_kind='removal' then
  update public.deletion_requests set status=p_status,review_note=p_note,reviewed_by=p_actor where id=p_id and revision=p_revision returning id into changed;
  if changed is null then return false;end if;
  insert into public.request_staff values(p_id,p_owner,p_internal) on conflict(request_id) do update set assigned_owner=excluded.assigned_owner,internal_note=excluded.internal_note;
 elsif p_kind='support' then
  update public.support_messages set status=p_status,customer_update=p_note,assigned_owner=p_owner,internal_note=p_internal,revision=revision+1 where id=p_id and revision=p_revision returning id into changed;
  if changed is null then return false;end if;
 else raise exception 'Invalid kind';end if;
 insert into public.admin_activity(actor_id,item_id,kind,details) values(p_actor,p_id,p_kind,jsonb_build_object('status',p_status,'customer_update',p_note,'assigned_owner',p_owner,'internal_note',p_internal));
 return true;
end;$$;
revoke all on function public.operations_rate_limit(text),public.admin_overview(text,int),public.review_operation(uuid,text,uuid,bigint,text,text,text,text) from public,anon,authenticated;
grant execute on function public.operations_rate_limit(text),public.admin_overview(text,int),public.review_operation(uuid,text,uuid,bigint,text,text,text,text) to service_role;
