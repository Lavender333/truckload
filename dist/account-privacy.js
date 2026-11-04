'use strict';
(function(){
 const checkbox=document.getElementById('confirmLocalDelete');
 const button=document.getElementById('deleteLocalData');
 const status=document.getElementById('deleteDataStatus');
 if(location.hash==='#account' && typeof tab==='function')tab('account');
 if(!button)return;
 button.addEventListener('click',async()=>{
  if(!checkbox.checked){status.textContent='Please confirm that you understand this deletion is permanent.';return;}
  if(!confirm('Delete all Truckload data and saved documents on this device? Export anything you need first. This cannot be undone.'))return;
  button.disabled=true;status.textContent='Deleting local Truckload data…';
  try{
   if(typeof window.closeTruckloadDocumentStorage==='function')await window.closeTruckloadDocumentStorage();
   if(window.indexedDB)await new Promise((resolve,reject)=>{
    const req=indexedDB.deleteDatabase('sagisolar-documents');
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(new Error('Saved documents could not be deleted. Please retry.'));
    req.onblocked=()=>reject(new Error('Document storage is open in another tab. Close other Truckload tabs, then retry.'));
   });
   const keys=[];
   for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith('sagi-'))keys.push(key);}
   for(const key of keys)localStorage.removeItem(key);
   status.textContent='Local Truckload records and documents deleted. Reloading…';
   location.reload();
  }catch(err){status.textContent=err.message||'Deletion failed. Try again.';button.disabled=false;}
 });
})();
