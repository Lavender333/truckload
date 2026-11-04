import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('Postgres backup policies isolate drivers, reject anonymous access and enforce revisions',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
   grant usage on schema public,auth to anon,authenticated;
   grant execute on function auth.uid() to anon,authenticated;
   insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261104182105_driver_cloud_backups.sql',import.meta.url),'utf8'));
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  const payload=JSON.stringify({format:'truckload-cloud-backup',version:1,records:{'sagi-trips':'[]'}});
  await db.exec(`set role anon`);await assert.rejects(db.query('select * from public.driver_backups'),/permission denied/);
  await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`);
  await assert.rejects(db.query('insert into public.driver_backups(user_id,payload,consent_version) values ($1,$2,$3)',[b,payload,'2026-11-04']),/row-level security/);
  await assert.rejects(db.query('insert into public.driver_backups(user_id,payload,consent_version) values ($1,$2,$3)',[a,'{}','2026-11-04']),/backup_shape/);
  await db.query('insert into public.driver_backups(user_id,payload,consent_version) values ($1,$2,$3)',[a,payload,'2026-11-04']);
  assert.equal((await db.query('select revision from public.driver_backups')).rows[0].revision,1);
  await assert.rejects(db.query('update public.driver_backups set user_id=$1',[b]),/row-level security/);
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);
  assert.equal((await db.query('select * from public.driver_backups')).rows.length,0);
  assert.equal((await db.query('update public.driver_backups set payload=$1 returning user_id',[payload])).rows.length,0);
  assert.equal((await db.query('delete from public.driver_backups returning user_id')).rows.length,0);
  await db.exec(`select set_config('request.jwt.claim.sub','${a}',false)`);
  assert.equal((await db.query('update public.driver_backups set payload=$1 where revision=1 returning revision',[payload])).rows[0].revision,2);
  assert.equal((await db.query('update public.driver_backups set payload=$1 where revision=1 returning revision',[payload])).rows.length,0);
  await db.exec(`reset role;delete from auth.users where id='${a}';set role authenticated`);
  assert.equal((await db.query('select * from public.driver_backups')).rows.length,0);
  await assert.rejects(db.query('insert into public.driver_backups(user_id,payload,consent_version) values ($1,$2,$3)',[a,payload,'2026-11-04']),/foreign key/);
 } finally {await db.close();}
});
