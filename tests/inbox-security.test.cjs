const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{transformSync}=require('esbuild');
async function harness({user=null,allowed=true,duplicate=false,providerOK=true}={}){
 let serve,forwarded=0;const calls=[];
 const db={auth:{getUser:async()=>({data:{user},error:null})},rpc:async()=>({data:allowed,error:null}),from:table=>{
  let op;const q={then:resolve=>Promise.resolve({data:[],error:op==='insert'&&duplicate?{code:'23505'}:null}).then(resolve)};
  for(const method of ['select','eq','order','limit','insert','update'])q[method]=(...args)=>{op=method;calls.push([table,method,...args]);return q;};return q;
 }};
 const src=fs.readFileSync('supabase/functions/app-inbox/index.ts','utf8').replace(/^import .*\n/,'');
 vm.runInNewContext(transformSync(src,{loader:'ts',format:'cjs'}).code,{createClient:()=>db,Request,Response,Promise,AbortSignal,TextEncoder,crypto:require('node:crypto').webcrypto,fetch:async()=>{forwarded++;return {ok:providerOK,json:async()=>({success:providerOK})};},Deno:{env:{get:()=>''},serve:h=>serve=h}});
 return {send:body=>serve(new Request('https://example.com',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)})),calls,forwarded:()=>forwarded};
}
const message={action:'support',id:'11111111-1111-4111-8111-111111111111',email:'driver@example.com',topic:'Bug report',message:'Please review this problem.'};
test('support is saved even if email forwarding fails, and duplicate retry does not send again',async()=>{
 const h=await harness({providerOK:false});const response=await h.send(message);assert.equal(response.status,200);assert.equal((await response.json()).success,true);assert.equal(h.forwarded(),1);assert(h.calls.some(c=>c[1]==='update'&&c[2].email_delivery==='failed'));
 const duplicate=await harness({duplicate:true});assert.equal((await duplicate.send(message)).status,200);assert.equal(duplicate.forwarded(),0);
});
test('support reads require verified caller and never accept a caller-selected email',async()=>{
 const denied=await harness();assert.equal((await denied.send({action:'my-support'})).status,401);assert.equal(denied.calls.length,0);
 const h=await harness({user:{id:'driver',email:'Driver@example.com',email_confirmed_at:'now'}});assert.equal((await h.send({action:'my-support',email:'victim@example.com'})).status,200);
 assert(h.calls.some(c=>c[1]==='eq'&&c[2]==='email'&&c[3]==='driver@example.com'));
 const columns=h.calls.find(c=>c[1]==='select')[2];assert(!columns.includes('internal'));assert(!columns.includes('message'));
});
test('inbox rejects excess requests and invalid topics without forwarding',async()=>{
 const rate=await harness({allowed:false});assert.equal((await rate.send(message)).status,429);assert.equal(rate.forwarded(),0);
 const invalid=await harness();assert.equal((await invalid.send({...message,topic:'arbitrary'})).status,400);assert.equal(invalid.forwarded(),0);
});
