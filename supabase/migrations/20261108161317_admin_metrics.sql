-- Consenting website sessions only; no emails, URLs, IPs or business records.
create table public.website_visits (
 session_id uuid primary key,
 visitor_id uuid not null,
 visited_at timestamptz not null default now()
);
create index website_visits_time_idx on public.website_visits(visited_at);
alter table public.website_visits enable row level security;
revoke all on public.website_visits from anon,authenticated;
grant select,insert on public.website_visits to service_role;
create function public.admin_metrics(p_days int default 30) returns jsonb language sql security invoker set search_path='' as $$
 with params as (select case when p_days in (7,30,90) then p_days else 30 end as days),
 bounds as (select days,date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' as today from params),
 visits as (select v.* from public.website_visits v,bounds b where v.visited_at>=b.today-(b.days-1)*interval '1 day'),
 drivers as (select email_confirmed_at as registered_at from auth.users where email_confirmed_at is not null and not coalesce(is_anonymous,false) and lower(coalesce(email,''))<>'truckload464@gmail.com')
 select jsonb_build_object(
 'days',b.days,'checkedAt',now(),
 'visits',(select count(*) from visits),
 'visitors',(select count(distinct visitor_id) from visits),
 'visitsToday',(select count(*) from visits where visited_at>=b.today),
 'registeredTotal',(select count(*) from drivers),
 'registeredNew',(select count(*) from drivers where registered_at>=b.today-(b.days-1)*interval '1 day'),
 'registeredToday',(select count(*) from drivers where registered_at>=b.today),
 'daily',(select jsonb_agg(jsonb_build_object('date',to_char(day at time zone 'UTC','YYYY-MM-DD'),'visits',(select count(*) from visits where visited_at>=day and visited_at<day+interval '1 day'),'registrations',(select count(*) from drivers where registered_at>=day and registered_at<day+interval '1 day')) order by day) from generate_series(b.today-(b.days-1)*interval '1 day',b.today,interval '1 day') as day)
 ) from bounds b;
$$;
revoke all on function public.admin_metrics(int) from public,anon,authenticated;
grant execute on function public.admin_metrics(int) to service_role;
