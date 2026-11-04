-- One explicit backup per verified driver. No document uploads or billing tables.
create table public.driver_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  saved_at timestamptz not null default now(),
  consent_version text not null check (consent_version = '2026-11-04'),
  constraint backup_shape check (
    coalesce(jsonb_typeof(payload) = 'object'
    and payload ->> 'format' = 'truckload-cloud-backup'
    and payload ->> 'version' = '1'
    and jsonb_typeof(payload -> 'records') = 'object'
    and octet_length(payload::text) <= 2097152, false)
  )
);
alter table public.driver_backups enable row level security;
revoke all on public.driver_backups from anon;
grant select, insert, update, delete on public.driver_backups to authenticated;
create policy own_backup_select on public.driver_backups for select to authenticated
using ((select auth.uid()) = user_id);
create policy own_backup_insert on public.driver_backups for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy own_backup_update on public.driver_backups for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_backup_delete on public.driver_backups for delete to authenticated
using ((select auth.uid()) = user_id);

create function public.stamp_driver_backup() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.saved_at := now();
  if TG_OP = 'INSERT' then new.revision := 1;
  else new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;
revoke all on function public.stamp_driver_backup() from public, anon, authenticated;
create trigger stamp_driver_backup before insert or update on public.driver_backups
for each row execute function public.stamp_driver_backup();
