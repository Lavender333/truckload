import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req: Request) => {
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply(401,{error:'Sign in first'});
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user||user.is_anonymous||!user.email_confirmed_at)return reply(401,{error:'Sign in again'});
  const body=await req.json();
  // Legacy clients also create a request; never report the account as deleted.
  if(!['REQUEST DELETION','DELETE MY ACCOUNT'].includes(body.confirm))return reply(400,{error:'Explicit confirmation required'});
  const scope=body.scope??'account';if(!['account','backup'].includes(scope))return reply(400,{error:'Invalid request type'});
  const {data:existing,error:readError}=await admin.from('deletion_requests').select('id,status,created_at').eq('user_id',user.id).eq('scope',scope).neq('status','closed').maybeSingle();
  if(readError)return reply(503,{error:'Could not check requests'});
  if(existing)return reply(200,{requested:true,request:existing});
  const {data,error:saveError}=await admin.from('deletion_requests').insert({user_id:user.id,scope}).select('id,status,created_at').single();
  if(saveError?.code==='23505')return reply(409,{error:'A request already exists. Refresh its status.'});
  if(saveError)return reply(503,{error:'Request was not saved. Try again.'});
  return reply(200,{requested:true,request:data});
 }catch{return reply(400,{error:'Could not process request'});}
});
