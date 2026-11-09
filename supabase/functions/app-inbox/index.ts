import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 try{
  const text=await req.text();if(text.length>10000)return reply(413,{error:'Message too large'});
  const body=JSON.parse(text),db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  if(body.action==='my-support'){
   const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!token)return reply(401,{error:'Sign in first'});
   const {data:{user},error}=await db.auth.getUser(token);
   if(error||!user?.email_confirmed_at||user.is_anonymous)return reply(401,{error:'Sign in again'});
   const {data,error:err}=await db.from('support_messages').select('id,topic,status,customer_update,created_at').eq('email',user.email!.toLowerCase()).order('created_at',{ascending:false}).limit(50);
   return err?reply(503,{error:'Support updates unavailable'}):reply(200,{rows:data});
  }
  if(!['support','event','visit'].includes(body.action))return reply(400,{error:'Invalid action'});
  // Rotating hashed network bucket, never store the source address or event payload.
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')+new Date().toISOString().slice(0,10)+ip));
  const bucket=body.action+':'+Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const {data:allowed,error:limitError}=await db.rpc('operations_rate_limit',{p_bucket:bucket});
  if(limitError)return reply(503,{error:'Please try later'});
  if(!allowed)return reply(429,{error:'Too many requests. Please try later.'});
  if(body.action==='visit'){
   if(body.consent!==true||!/^[-0-9a-f]{36}$/i.test(body.session_id)||!/^[-0-9a-f]{36}$/i.test(body.visitor_id))return reply(400,{error:'Invalid visit'});
   const {error}=await db.from('website_visits').insert({session_id:body.session_id,visitor_id:body.visitor_id});
   return error&&error.code!=='23505'?reply(503,{error:'Visit unavailable'}):reply(200,{accepted:true});
  }
  if(body.action==='event'){
   if(!['email_request_failed','backup_failed'].includes(body.kind))return reply(400,{error:'Invalid event'});
   const {error}=await db.from('service_events').insert({kind:body.kind});
   return error?reply(503,{error:'Event unavailable'}):reply(200,{accepted:true});
  }
  if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.message!=='string'||!body.message.trim()||body.message.length>2000||!['General question','Bug report','Feature request','Privacy or deletion','Request deletion of support information'].includes(body.topic)||!/^[-0-9a-f]{36}$/i.test(body.id))return reply(400,{error:'Check email, topic and message'});
  const record={id:body.id,email:body.email.trim().toLowerCase(),topic:body.topic,message:body.message.trim()};
  const {error}=await db.from('support_messages').insert(record);
  // Duplicate retries do not forward mail twice or reveal an existing message.
  if(error?.code==='23505')return reply(200,{success:true});
  if(error)return reply(503,{error:'Message was not saved'});
  let accepted=false;
  try{
   const response=await fetch('https://api.web3forms.com/submit',{method:'POST',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:'4966ba24-4d88-4f94-a987-2913346f8b46',email:record.email,subject:'Truckload support: '+record.topic,topic:record.topic,message:record.message,from_name:'Truckload support form'})});
   accepted=response.ok&&(await response.json()).success===true;
  }catch{/* Message remains safely in dashboard even if mail delivery fails. */}
  await db.from('support_messages').update({email_delivery:accepted?'accepted':'failed'}).eq('id',record.id);
  return reply(200,{success:true,emailAccepted:accepted});
 }catch{return reply(503,{error:'Request could not be completed'});}
});
