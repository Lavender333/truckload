const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8017');
 assert.equal(await page.evaluate(()=>!!window.__truckloadGtmLoaded),false);
 await page.click('#analyticsDecline');
 await page.reload();
 assert.equal(await page.evaluate(()=>localStorage.getItem('truckload-analytics-consent-v1')),'denied');
 assert.equal(await page.evaluate(()=>!!window.__truckloadGtmLoaded),false);
 await page.fill('#origin','Atlanta');await page.fill('#destination','Orlando');await page.fill('#pay','2000');await page.fill('#miles','400');await page.click('#tripForm button[type="submit"]');await page.click('#saveTrip');
 for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const tab of ['plan','connections','saved','dashboard','settings','business','account']){
   await page.evaluate(id=>window.tab(id),tab);
   await page.evaluate(()=>{document.querySelectorAll('.page:not([hidden]) details').forEach(x=>x.open=true);if(!document.querySelector('#plan').hidden)document.querySelector('#rateconReview').hidden=false;});
   const overflow=await page.evaluate(()=>[...document.querySelectorAll('.page:not([hidden]) input,.page:not([hidden]) select,.page:not([hidden]) .card,.page:not([hidden]) .result')].filter(x=>x.getClientRects().length).filter(x=>{const r=x.getBoundingClientRect();return r.right>innerWidth+1||r.left<0}).map(x=>x.id||x.className));
   assert.deepEqual(overflow,[],engine.name()+' '+width+' '+tab);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),tab+' page overflow');
  }
 }
 await page.evaluate(()=>tab('connections'));
 await page.click('[data-product="DEF"]');await page.fill('#purchaseGallons','10');await page.fill('#purchasePrice','4');
 assert.equal(await page.inputValue('#purchaseTotal'),'40.00');
 await page.click('#manualFuelForm button.primary');assert.match(await page.textContent('#fuelTotals'),/40.00/);
 await page.evaluate(()=>tab('business'));await page.fill('#expenseAmount','25');await page.click('#businessExpenseForm button.primary');
 await page.evaluate(()=>tab('dashboard'));assert.equal(await page.locator('#dashboardTotals .card').count(),2);
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>{tab('plan');document.querySelector('#uploadPanel').open=true;document.querySelector('#rateconReview').hidden=false});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/truckload-'+engine.name()+'.png',fullPage:true});
 console.log(engine.name()+': all seven tabs fit 7 viewport sizes; fuel and business forms pass');
 await browser.close();
}
})().catch(e=>{console.error(e);process.exit(1)});
