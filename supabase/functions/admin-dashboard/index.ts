import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply(401,{error:'Sign in first'});
 try{
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await db.auth.getUser(token);
  // Trusted Auth response, never client metadata. Email changes require confirmation.
  if(error||!user||user.is_anonymous||!user.email_confirmed_at)return reply(401,{error:'Sign in again'});
  if(user.email?.toLowerCase()!=='truckload464@gmail.com')return reply(403,{error:'Administrator access required'});
  const body=await req.json();
  if(body.action==='review'){
   const kind=body.kind||'removal',owner=body.owner||'',internal=body.internal||'';
   if(!['removal','support'].includes(kind)||!['received','in_review','closed'].includes(body.status)||typeof body.note!=='string'||body.note.trim().length<10||body.note.length>2000||typeof owner!=='string'||!['','truckload464@gmail.com'].includes(owner)||typeof internal!=='string'||internal.length>4000||!Number.isSafeInteger(body.revision)||!/^[-0-9a-f]{36}$/i.test(body.id))return reply(400,{error:'Check the review fields.'});
   const {data,error:err}=await db.rpc('review_operation',{p_actor:user.id,p_kind:kind,p_id:body.id,p_revision:body.revision,p_status:body.status,p_note:body.note.trim(),p_owner:owner,p_internal:internal});
   if(err)return reply(503,{error:'Review could not be saved'});
   if(!data)return reply(409,{error:'Request changed. Refresh before saving.'});
   return reply(200,{saved:true});
  }
  const offset=Number.isSafeInteger(body.offset)&&body.offset>=0?body.offset:0;
  if(body.action==='metrics'){
   const {data,error:err}=await db.rpc('admin_metrics',{p_days:[7,30,90].includes(body.days)?body.days:30});
   return err?reply(503,{error:'Metrics unavailable'}):reply(200,data);
  }
  if(body.action==='overview'){
   const {data,error:err}=await db.rpc('admin_overview',{p_search:typeof body.search==='string'?body.search.slice(0,254):'',p_offset:offset});
   return err?reply(503,{error:'Overview unavailable'}):reply(200,data);
  }
  if(body.action==='support'||body.action==='activity'){
   const table=body.action==='support'?'support_messages':'admin_activity';
   const {data,error:err,count}=await db.from(table).select('*',{count:'exact'}).order('created_at',{ascending:body.action==='support'}).order('id').range(offset,offset+49);
   if(err)return reply(503,{error:'Records unavailable'});
   const rows=await Promise.all((data||[]).map(async r=>{
    if(!r.actor_id)return r;
    const {data:a}=await db.auth.admin.getUserById(r.actor_id);return {...r,actor_email:a.user?.email||r.actor_id};
   }));
   return reply(200,{rows,total:count||0});
  }
  if(body.action!=='list')return reply(400,{error:'Unknown action'});
  const [requests,backups]=await Promise.all([db.from('deletion_requests').select('*',{count:'exact'}).order('created_at',{ascending:true}).order('id').range(offset,offset+49),db.from('driver_backups').select('user_id',{count:'exact',head:true})]);

  if(requests.error||backups.error)return reply(503,{error:'Dashboard could not load'});
  const rows=await Promise.all((requests.data??[]).map(async r=>{
   const {data,error:err}=await db.auth.admin.getUserById(r.user_id);
   const staff=await db.from('request_staff').select('assigned_owner,internal_note').eq('request_id',r.id).maybeSingle();
   if(err||staff.error)throw err||staff.error;
   return {...r,...staff.data,email:data.user?.email??'Unavailable'};
  }));
  return reply(200,{requests:rows,total:requests.count??0,backupCount:backups.count??0,offset});
 }catch{return reply(503,{error:'Dashboard request failed'});}
});
