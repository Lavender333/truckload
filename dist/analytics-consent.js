'use strict';
(function(){
 const key='truckload-analytics-consent-v1';
 const container='GTM-NDGH4QWW';
 function read(){try{return localStorage.getItem(key)}catch(_){return null}}
 function write(value){try{localStorage.setItem(key,value)}catch(_){}}
 function show(){const banner=document.getElementById('analyticsConsent');if(banner)banner.hidden=false}
 function hide(){const banner=document.getElementById('analyticsConsent');if(banner)banner.hidden=true}
 function enable(){
  if(window.__truckloadGtmLoaded)return;
  window.__truckloadGtmLoaded=true;
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
  const script=document.createElement('script');
  script.async=true;
  script.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(container);
  document.head.appendChild(script);
 }
 function choose(value){write(value);hide();if(value==='granted')enable();else if(window.__truckloadGtmLoaded)location.reload()}
 document.addEventListener('DOMContentLoaded',()=>{
  const allow=document.getElementById('analyticsAllow');
  const decline=document.getElementById('analyticsDecline');
  const preferences=document.getElementById('analyticsPreferences');
  if(allow)allow.addEventListener('click',()=>choose('granted'));
  if(decline)decline.addEventListener('click',()=>choose('denied'));
  if(preferences)preferences.addEventListener('click',show);
  const choice=read();
  if(choice==='granted')enable();else if(choice!=='denied')show();
 });
})();
