'use strict';
(function(){
 const checkbox=document.getElementById('confirmLocalDelete'),button=document.getElementById('deleteLocalData'),status=document.getElementById('deleteDataStatus');
 if(!button)return;
 button.addEventListener('click',async()=>{
  if(!checkbox.checked){status.textContent='Check the confirmation box first.';return;}
  if(!window.confirm('Permanently delete Truckload trips, settings, fuel records and saved documents from this device? This cannot be undone.'))return;
  button.disabled=true;status.textContent='Deleting device data…';
  try{
   const dbNames=['sagisolar-documents'];
   await Promise.all(dbNames.map(name=>new Promise((resolve,reject)=>{if(!window.indexedDB){resolve();return;}const req=indexedDB.deleteDatabase(name);req.onsuccess=resolve;req.onerror=()=>reject(Error('Could not delete saved documents. Close other Truckload tabs and retry.'));req.onblocked=()=>reject(Error('Close other Truckload tabs and retry deleting documents.'));})));
   const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('sagi-'))keys.push(k);}
   keys.forEach(k=>localStorage.removeItem(k));
   status.textContent='Device data deleted. Reloading…';window.location.reload();
  }catch(e){status.textContent=e.message;button.disabled=false;}
 });
})();
