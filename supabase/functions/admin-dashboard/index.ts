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
   if(!['received','in_review','closed'].includes(body.status)||typeof body.note!=='string'||body.note.trim().length<10||body.note.length>2000||!Number.isSafeInteger(body.revision)||typeof body.id!=='string')return reply(400,{error:'Choose a status and enter a review note (10–2000 characters).'});
   const {data,error:err}=await db.from('deletion_requests').update({status:body.status,review_note:body.note.trim(),reviewed_by:user.id}).eq('id',body.id).eq('revision',body.revision).select('id').maybeSingle();
   if(err)return reply(503,{error:'Review could not be saved'});
   if(!data)return reply(409,{error:'Request changed. Refresh before saving.'});
   return reply(200,{saved:true});
  }
  if(body.action!=='list')return reply(400,{error:'Unknown action'});
  const offset=Number.isSafeInteger(body.offset)&&body.offset>=0?body.offset:0;
  const [requests,backups]=await Promise.all([db.from('deletion_requests').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+49),db.from('driver_backups').select('user_id',{count:'exact',head:true})]);
  if(requests.error||backups.error)return reply(503,{error:'Dashboard could not load'});
  const rows=await Promise.all((requests.data??[]).map(async r=>{
   const {data,error:err}=await db.auth.admin.getUserById(r.user_id);
   if(err)throw err;
   return {...r,email:data.user?.email??'Unavailable'};
  }));
  return reply(200,{requests:rows,total:requests.count??0,backupCount:backups.count??0,offset});
 }catch{return reply(503,{error:'Dashboard request failed'});}
});
