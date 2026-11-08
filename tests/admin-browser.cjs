const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');
(async()=>{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();const page=await browser.newPage();let denied=true,fail=false,updates=0;let history=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.com',aud:'authenticated',role:'authenticated'};
 const jwt=[{alg:'HS256'},{sub:user.id,exp:Math.floor(Date.now()/1000)+3600},'test'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
 const request={id:'request1',scope:'account',email:'<img src=x onerror=alert(1)>',status:'received',revision:1,created_at:new Date().toISOString(),review_note:''};
 await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"window.TRUCKLOAD_CLOUD={enabled:true,url:'https://test.supabase.co',publishableKey:'sb_publishable_test'}"}));
 await page.route('https://test.supabase.co/**',async r=>{let body={},status=200;const path=new URL(r.request().url()).pathname;
 if(path==='/auth/v1/verify')body={access_token:jwt,refresh_token:'test',expires_in:3600,token_type:'bearer',user};
 else if(path==='/functions/v1/admin-dashboard'){
  if(denied){status=403;body={error:'Denied'};}else if(fail){status=409;body={error:'Conflict'};}else{const input=r.request().postDataJSON();if(input.action==='review'){updates++;request.status=input.status;request.review_note=input.note;request.revision++;history.push({actor_email:user.email,created_at:new Date().toISOString(),item_id:input.id,kind:input.kind,details:{status:input.status,assigned_owner:input.owner,internal_note:input.internal,customer_update:input.note}});body={saved:true};}else if(input.action==='overview')body={driverCount:2,newDrivers:1,backupCount:1,pendingRequests:1,pendingSupport:0,driverTotal:1,drivers:[{email:'driver@example.com'}],health:{emailFailures24h:1,backupFailures24h:2,supportEmailFailures:0},checkedAt:new Date().toISOString()};else if(input.action==='support')body={rows:[{id:'support1',email:'driver@example.com',topic:'Bug report',message:'Test support message',status:'received',revision:1,created_at:new Date().toISOString(),email_delivery:'failed'}],total:1};else if(input.action==='activity')body={rows:history,total:history.length};else body={requests:[request],total:1,backupCount:1};}
 }await r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});});
 await page.route('https://status.supabase.com/**',r=>r.fulfill({contentType:'application/json',body:'{"incidents":[]}'}));
 await page.goto('http://127.0.0.1:8017/admin.html');
 const login=async()=>{await page.fill('#adminEmail',user.email);await page.click('#adminSend button');await page.fill('#adminCode','12345678');await page.click('#adminVerify button');};
 await login();await page.waitForFunction(()=>document.querySelector('#adminStatus').textContent.includes('not accepted'));assert.equal(await page.locator('#adminPanel').isVisible(),false);
 denied=false;await login();await page.waitForFunction(()=>document.querySelector('#adminStatus').textContent.includes('Signed in'));
 assert.equal(await page.locator('#adminRequests img').count(),0);assert(await page.locator('#adminRequests').textContent().then(t=>t.includes('<img')));
 await page.click('#adminRequests button');await page.waitForFunction(()=>document.querySelector('#adminStatus').textContent.includes('at least 10'));assert.equal(updates,0);
 await page.locator('#adminRequests textarea').nth(1).fill('Review started; no records erased.');await page.locator('#adminRequests select').first().selectOption('in_review');
 fail=true;await page.click('#adminRequests button');await page.waitForFunction(()=>document.querySelector('#adminStatus').textContent.includes('not accepted'));assert.equal(updates,0);fail=false;
 await page.click('#adminRequests button');await page.waitForFunction(()=>document.querySelector('#adminStatus').textContent.includes('Review saved'));assert.equal(updates,1);
 assert((await page.locator('#adminActivity').textContent()).includes(user.email));
 assert((await page.locator('#adminCounts').textContent()).includes('verified driver accounts'));
 await page.locator('#adminSupport textarea').first().fill('Private support note');await page.locator('#adminSupport textarea').nth(1).fill('Customer support update');await page.locator('#adminSupport select').nth(1).selectOption('truckload464@gmail.com');await page.locator('#adminSupport button').click();await page.waitForFunction(()=>document.querySelector('#adminActivity').textContent.includes('Private support note'));assert.equal(updates,2);
 await page.fill('#driverSearch','driver@');await page.click('#driverLookup button');await page.waitForFunction(()=>!document.querySelector('#driverLookup button').disabled);
 await page.click('#adminRefresh');await page.waitForFunction(()=>document.querySelector('#adminStatus').textContent.includes('Dashboard refreshed'));
 await page.click('#adminSignOut');await page.waitForFunction(()=>document.querySelector('#adminStatus').textContent==='Signed out.');for(const id of ['adminRequests','adminActivity','adminDrivers','adminSupport','adminHealth'])assert.equal(await page.locator('#'+id).textContent(),'');assert.deepEqual(errors,[]);
 await browser.close();console.log(engine.name()+': admin access denial, safe rendering, review validation/conflict, save, refresh and sign-out passed');
}})().catch(e=>{console.error(e);process.exit(1)});
