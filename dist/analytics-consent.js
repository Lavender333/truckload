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
 function enable(){
  if(native||window.__truckloadGtmLoaded)return;
  window.__truckloadGtmLoaded=true;
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
  const script=document.createElement('script');script.async=true;
  script.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(container);
  document.head.appendChild(script);
 }
 function choose(value){if(native)return;write(value);render();if(value==='granted')enable();else if(window.__truckloadGtmLoaded){location.hash='account';location.reload();}}
 document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('analyticsAllow')?.addEventListener('click',()=>choose('granted'));
  document.getElementById('analyticsDecline')?.addEventListener('click',()=>choose('denied'));
  document.getElementById('analyticsPreferences')?.addEventListener('click',()=>{window.tab('account');document.getElementById('analyticsConsent')?.scrollIntoView({block:'center'});});
  render();if(read()==='granted')enable();
 });
})();
