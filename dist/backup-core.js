'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TruckloadBackup=api;})(globalThis,()=>{
 const keys=['sagi-profile','sagi-trips','sagi-fuel','sagi-provider','truckload-business-budgets','truckload-business-expenses'];
 const ownerKey='truckload-backup-owner';
 function validate(payload){
  if(!payload||payload.format!=='truckload-cloud-backup'||payload.version!==1||!payload.records||Array.isArray(payload.records)||typeof payload.records!=='object')throw Error('This is not a supported Truckload backup.');
  if(new TextEncoder().encode(JSON.stringify(payload)).length>1900000)throw Error('Backup exceeds the 1.9 MB limit. Export your records instead.');
  for(const [key,value] of Object.entries(payload.records)){
   if(!keys.includes(key)||typeof value!=='string')throw Error('Backup contains an unsupported record.');
   const parsed=JSON.parse(value);
   if(key==='sagi-provider'){if(typeof parsed!=='string')throw Error('Invalid provider setting.');}
   else if(key==='sagi-profile'){if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error('Invalid truck settings.');}
   else if(!Array.isArray(parsed)||parsed.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw Error('Invalid record list.');
  }
  return payload;
 }
 function capture(storage){
  const records={};for(const key of keys){const value=storage.getItem(key);if(value!==null)records[key]=value;}
  return validate({format:'truckload-cloud-backup',version:1,createdAt:new Date().toISOString(),records});
 }
 function assertOwner(storage,userId){const owner=storage.getItem(ownerKey);if(owner&&owner!==userId)throw Error('These local records belong to a different signed-in driver. Use that account or a separate empty device or browser profile.');}
 function restoreEmpty(storage,payload,userId){
  validate(payload);assertOwner(storage,userId);
  if(keys.some(key=>storage.getItem(key)!==null))throw Error('Restore requires empty local storage. Use a new device or a separate empty browser profile.');
  const records={...payload.records};
  // Documents stay on the original device; never link restored trips to unrelated local files.
  if(records['sagi-trips'])records['sagi-trips']=JSON.stringify(JSON.parse(records['sagi-trips']).map(t=>({...t,rateconId:null})));
  const previousOwner=storage.getItem(ownerKey);
  try{for(const [key,value] of Object.entries(records))storage.setItem(key,value);storage.setItem(ownerKey,userId);}
  catch(error){for(const key of keys)storage.removeItem(key);if(previousOwner===null)storage.removeItem(ownerKey);else storage.setItem(ownerKey,previousOwner);throw Error('Restore failed; no records were restored. Check device storage.');}
 }
 return {keys,ownerKey,validate,capture,assertOwner,restoreEmpty};
});
