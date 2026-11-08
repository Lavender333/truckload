const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{transformSync}=require('esbuild');
async function handler(name,user,result={data:[],count:0,error:null}){
 let serve;const calls=[];
 const db={auth:{getUser:async()=>({data:{user},error:null}),admin:{getUserById:async()=>({data:{user:{email:'driver@example.com'}},error:null})}},rpc:async(...args)=>{calls.push(['rpc',...args]);return result;},from:table=>{calls.push(['table',table]);const q={then:resolve=>Promise.resolve(result).then(resolve)};for(const method of ['select','eq','neq','order','range','insert','update','maybeSingle','single'])q[method]=(...args)=>{calls.push([method,...args]);return q;};return q;}};
 const src=fs.readFileSync(`supabase/functions/${name}/index.ts`,'utf8').replace(/^import .*\n/,'');
 vm.runInNewContext(transformSync(src,{loader:'ts',format:'cjs'}).code,{createClient:()=>db,Request,Response,Promise,Deno:{env:{get:()=>''},serve:h=>serve=h}});
 return {send:body=>serve(new Request('https://example.com',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)})),calls};
}
test('admin rejects ordinary users, forged metadata and unverified owner',async()=>{
 for(const user of [{id:'driver',email:'driver@example.com',email_confirmed_at:'now',user_metadata:{admin:true,email:'truckload464@gmail.com'}},{id:'owner',email:'truckload464@gmail.com'},{id:'anon',email:'truckload464@gmail.com',email_confirmed_at:'now',is_anonymous:true}]){const h=await handler('admin-dashboard',user);assert([401,403].includes((await h.send({action:'list'})).status));assert.equal(h.calls.length,0);}
});
test('admin accepts verified owner and handles conflict without deleting',async()=>{
 const h=await handler('admin-dashboard',{id:'owner',email:'truckload464@gmail.com',email_confirmed_at:'now'},{data:null,error:null});
 assert.equal((await h.send({action:'review',id:'11111111-1111-4111-8111-111111111111',revision:1,status:'closed',note:'Reviewed by the owner.'})).status,409);
 assert(h.calls.some(c=>c[0]==='rpc'));assert(!h.calls.some(c=>c[0]==='delete'));
});
test('legacy deletion calls become requests tied to caller and never delete users',async()=>{
 const user={id:'real-driver',email:'driver@example.com',email_confirmed_at:'now'};
 const h=await handler('delete-account',user,{data:null,error:null});const response=await h.send({confirm:'DELETE MY ACCOUNT',user_id:'victim'});
 assert.equal(response.status,200);assert.equal((await response.json()).requested,true);
 const insert=h.calls.find(c=>c[0]==='insert');assert.equal(insert[1].user_id,'real-driver');assert.equal(insert[1].scope,'account');assert(!h.calls.some(c=>c[0]==='delete'));
});
