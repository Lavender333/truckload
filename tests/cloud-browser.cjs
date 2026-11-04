const { chromium, webkit }=require('playwright');
const assert=require('node:assert/strict');
const user={id:'11111111-1111-4111-8111-111111111111',email:'driver@example.com',aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString()};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
(async()=>{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();const page=await browser.newPage();let backup=null,uploads=0,conflict=false;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'application/javascript',body:"window.TRUCKLOAD_CLOUD={enabled:true,url:'https://test.supabase.co',publishableKey:'sb_publishable_test'}"}));
 await page.route('https://test.supabase.co/**',async r=>{
  const req=r.request(),path=new URL(req.url()).pathname,method=req.method();let body,status=200;
  if(path==='/auth/v1/otp')body={};
  else if(path==='/auth/v1/verify')body={access_token:jwt,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user};
  else if(path==='/auth/v1/user')body=user;
  else if(path==='/auth/v1/logout')body={};
  else if(path==='/rest/v1/driver_backups'){
   if(method==='GET')body=backup?[backup]:[];
   else if(method==='POST'||method==='PATCH'){
    if(conflict){body=[];}else{uploads++;backup={...req.postDataJSON(),revision:uploads,saved_at:new Date().toISOString()};body=[backup];}
   }else if(method==='DELETE'){backup=null;body=[{user_id:user.id}];}
  }else if(path==='/functions/v1/delete-account'){backup=null;body={deleted:true};}
  else{status=404;body={error:'unexpected endpoint'};}
  await r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('http://127.0.0.1:8017');await page.click('#analyticsDecline');await page.evaluate(()=>tab('account'));
 await page.fill('#cloudEmail',user.email);await page.click('#cloudSendCode button');await page.fill('#cloudCode','123456');await page.click('#cloudVerifyCode button');
 await page.waitForFunction(()=>document.querySelector('#cloudIdentity').textContent.includes('driver@example.com'));
 await page.waitForFunction(()=>!document.querySelector('#cloudSave').disabled);
 assert.equal(uploads,0);
 await page.click('#cloudSave');await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Confirm the backup'));assert.equal(uploads,0);
 await page.evaluate(()=>{localStorage.setItem('sagi-trips','[{"id":"local-trip"}]');localStorage.setItem('truckload-business-expenses','[{"amount":25}]');});
 await page.check('#cloudConsent');await page.click('#cloudSave');await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Cloud backup saved'));
 assert.equal(uploads,1);assert(backup.payload.records['truckload-business-expenses']);
 conflict=true;await page.click('#cloudSave');await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Another device'));assert.equal(uploads,1);conflict=false;
 await page.click('#cloudRestore');await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('empty local storage'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sagi-trips'))[0].id),'local-trip');
 await page.locator('#cloudSignedIn details summary').click();await page.fill('#cloudDeleteConfirm','DELETE MY ACCOUNT');
 await page.click('#cloudDeleteAccount');await page.waitForFunction(()=>document.querySelector('#cloudStatus').textContent.includes('Account and cloud backup deleted'));
 assert.equal(backup,null);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sagi-trips'))[0].id),'local-trip');assert.deepEqual(errors,[]);
 await browser.close();console.log(engine.name()+': mocked OTP, consent, save, stale revision, restore protection and account deletion passed');
}})().catch(e=>{console.error(e);process.exit(1)});
