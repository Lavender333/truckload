'use strict';
(function(){
 const key='truckload-analytics-consent-v1';
 const container='GTM-NDGH4QWW';
 const native=location.protocol==='capacitor:'||!!window.Capacitor?.isNativePlatform?.();
 function read(){try{return localStorage.getItem(key)}catch(_){return null}}
 function write(value){try{localStorage.setItem(key,value)}catch(_){}}
 function render(){
  const status=document.getElementById('analyticsStatus');
  if(status)status.textContent=native?'Google analytics is disabled in the iPhone app.':read()==='granted'?'Optional website analytics is on.':'Optional website analytics is off.';
  for(const id of ['analyticsAllow','analyticsDecline']){const el=document.getElementById(id);if(el)el.hidden=native;}
 }
 function countVisit(){
  if(native||read()!=='granted'||!window.TRUCKLOAD_CLOUD?.enabled)return;
  try{
   const now=Date.now(),visitorKey='truckload-analytics-visitor',sessionKey='truckload-analytics-session';
   let visitor=JSON.parse(localStorage.getItem(visitorKey)||'null');
   if(!visitor||now-visitor.started>=30*86400000){visitor={id:crypto.randomUUID(),started:now};localStorage.setItem(visitorKey,JSON.stringify(visitor));}
   let session=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
   if(!session||now-session.started>=1800000){session={id:crypto.randomUUID(),started:now};sessionStorage.setItem(sessionKey,JSON.stringify(session));}
   // Retrying the same session is idempotent on the server. Nothing identifies an account.
   fetch(window.TRUCKLOAD_CLOUD.url+'/functions/v1/app-inbox',{method:'POST',headers:{'Content-Type':'application/json',apikey:window.TRUCKLOAD_CLOUD.publishableKey},body:JSON.stringify({action:'visit',consent:true,session_id:session.id,visitor_id:visitor.id}),keepalive:true}).catch(()=>{});
  }catch{} // Storage restrictions must not interfere with app use.
 }
 function enable(){
  if(native||window.__truckloadGtmLoaded)return;
  countVisit();
  window.__truckloadGtmLoaded=true;
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
  const script=document.createElement('script');script.async=true;
  script.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(container);
  document.head.appendChild(script);
 }
 function choose(value){if(native)return;if(value==='denied'){try{localStorage.removeItem('truckload-analytics-visitor');sessionStorage.removeItem('truckload-analytics-session');}catch{}}write(value);render();if(value==='granted')enable();else if(window.__truckloadGtmLoaded){location.hash='account';location.reload();}}
 document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('analyticsAllow')?.addEventListener('click',()=>choose('granted'));
  document.getElementById('analyticsDecline')?.addEventListener('click',()=>choose('denied'));
  document.getElementById('analyticsPreferences')?.addEventListener('click',()=>{window.tab('account');document.getElementById('analyticsConsent')?.scrollIntoView({block:'center'});});
  render();if(read()==='granted')enable();
 });
})();
