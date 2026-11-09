import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('private operations: counts, literal lookup, notes isolation, atomic reviews, audit and throttling',async()=>{
 const db=new PGlite();try{
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz,email_confirmed_at timestamptz,is_anonymous boolean default false);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant select on auth.users to service_role;grant execute on function auth.uid() to authenticated;insert into auth.users(id,email,email_confirmed_at) values('${a}','driver@example.com',now()),('${b}','owner@example.com',now());`);
 for(const name of (await readdir('supabase/migrations')).sort())await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 await db.exec('set role service_role');
 let overview=(await db.query("select admin_overview('',0) as result")).rows[0].result;assert.equal(overview.driverCount,2);assert.equal(overview.newDrivers,2);
 assert.equal((await db.query("select admin_overview('%',0) as result")).rows[0].result.driverTotal,0);
 const r=(await db.query("insert into deletion_requests(user_id,scope) values($1,'account') returning id",[a])).rows[0];
 const review=[b,'removal',r.id,1,'in_review','Visible update','owner@example.com','PRIVATE NOTE'];
 assert.equal((await db.query('select review_operation($1,$2,$3,$4,$5,$6,$7,$8) as saved',review)).rows[0].saved,true);
 assert.equal((await db.query('select review_operation($1,$2,$3,$4,$5,$6,$7,$8) as saved',review)).rows[0].saved,false);
 assert.equal((await db.query('select * from admin_activity')).rows.length,1);
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`);
 assert.equal((await db.query('select review_note from deletion_requests')).rows[0].review_note,'Visible update');
 for(const table of ['request_staff','support_messages','admin_activity','service_events','ingestion_limits'])await assert.rejects(db.query('select * from '+table),/permission denied/);
 await assert.rejects(db.query("select admin_overview('',0)"),/permission denied/);
 await assert.rejects(db.query('select review_operation($1,$2,$3,$4,$5,$6,$7,$8)',review),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(db.query("select admin_overview('',0)"),/permission denied/);
 await db.exec('reset role;set role service_role');
 for(let i=0;i<21;i++)assert.equal((await db.query("select operations_rate_limit('test') as allowed")).rows[0].allowed,i<20);
 const support=(await db.query("insert into support_messages(id,email,topic,message) values(gen_random_uuid(),'driver@example.com','Bug report','test') returning id")).rows[0];
 assert.equal((await db.query('select review_operation($1,$2,$3,$4,$5,$6,$7,$8) as saved',[b,'support',support.id,1,'closed','Customer support update','','Staff only'])).rows[0].saved,true);
 assert.equal((await db.query('select * from admin_activity')).rows.length,2);
 await db.query('insert into website_visits(session_id,visitor_id) values($1,$2)',[a,a]);
 await assert.rejects(db.query('insert into website_visits(session_id,visitor_id) values($1,$2)',[a,a]),/unique/);
 await db.query('insert into website_visits(session_id,visitor_id) values($1,$2)',[b,a]);
 const metrics=(await db.query('select admin_metrics(7) as result')).rows[0].result;
 assert.equal(metrics.visits,2);assert.equal(metrics.visitors,1);assert.equal(metrics.daily.length,7);assert.equal(metrics.registeredTotal,2);
 await db.exec('reset role;set role authenticated');await assert.rejects(db.query('select * from website_visits'),/permission denied/);await assert.rejects(db.query('select admin_metrics(30)'),/permission denied/);

 }finally{await db.close();}
});
