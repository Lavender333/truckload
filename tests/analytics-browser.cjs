const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 for(const native of [false,true]){
  const page=await browser.newPage();let requests=0;
  await page.route('https://www.googletagmanager.com/**',r=>{requests++;return r.fulfill({body:''});});
  if(native)await page.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true};localStorage.setItem('truckload-analytics-consent-v1','granted');});
  await page.goto('http://127.0.0.1:8017');assert.equal(requests,0);assert.equal(await page.locator('#analyticsConsent').isVisible(),false);
  await page.click('#analyticsPreferences');assert(await page.locator('#analyticsConsent').isVisible());
  assert.notEqual(await page.locator('#analyticsConsent').evaluate(e=>getComputedStyle(e).position),'fixed');
  if(native){assert.equal(await page.locator('#analyticsAllow').isVisible(),false);assert.equal(requests,0);}
  else{await page.click('#analyticsAllow');await page.waitForFunction(()=>window.__truckloadGtmLoaded);await page.click('#analyticsDecline');await page.waitForFunction(()=>localStorage.getItem('truckload-analytics-consent-v1')==='denied'&&!window.__truckloadGtmLoaded);assert.equal(requests,1);}
  await page.close();
 }
 await browser.close();console.log(engine.name()+': no popup, website opt-in/revoke, native blocks previously granted analytics passed');
}})().catch(e=>{console.error(e);process.exit(1)});
