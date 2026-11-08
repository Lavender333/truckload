import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('request workflow preserves backups, isolates drivers and audits admin updates',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to authenticated;insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
 for(const name of ['20261104182105_driver_cloud_backups.sql','20261107184713_reviewed_deletion_requests.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 await db.query('insert into driver_backups(user_id,payload,consent_version) values($1,$2,$3)',[a,JSON.stringify({format:'truckload-cloud-backup',version:1,records:{}}),'2026-11-04']);
 await db.exec(`set role service_role`);const r=(await db.query('insert into deletion_requests(user_id,scope) values($1,$2) returning *',[a,'account'])).rows[0];
 assert.equal((await db.query('select * from deletion_request_events')).rows.length,1);
 await assert.rejects(db.query('insert into deletion_requests(user_id,scope) values($1,$2)',[a,'account']),/unique/);
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`);
 assert.equal((await db.query('select * from deletion_requests')).rows.length,1);
 for(const sql of ['delete from driver_backups','delete from deletion_requests','update deletion_requests set status=\'closed\'','select * from deletion_request_events'])await assert.rejects(db.query(sql),/permission denied/);
 await assert.rejects(db.query('insert into deletion_requests(user_id,scope) values($1,$2)',[a,'account']),/permission denied/);
 await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);assert.equal((await db.query('select * from deletion_requests')).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from deletion_requests'),/permission denied/);
 await db.exec('reset role;set role service_role');
 const updated=await db.query("update deletion_requests set status='in_review',review_note='Review started by owner',reviewed_by=$1 where id=$2 and revision=1 returning revision",[b,r.id]);assert.equal(updated.rows[0].revision,2);
 assert.equal((await db.query("update deletion_requests set status='closed' where id=$1 and revision=1 returning id",[r.id])).rows.length,0);
 assert.equal((await db.query('select * from deletion_request_events')).rows.length,2);
 await db.exec('reset role');assert.equal((await db.query('select * from driver_backups')).rows.length,1);assert.equal((await db.query('select * from auth.users')).rows.length,2);
 }finally{await db.close();}
});
