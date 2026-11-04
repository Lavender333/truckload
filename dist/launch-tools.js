'use strict';
(function(){
 const backup=document.getElementById('exportBackup');
 if(backup)backup.addEventListener('click',()=>{
  const status=document.getElementById('backupStatus');
  try{
   const records={};
   for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith('sagi-'))records[key]=localStorage.getItem(key);}
   const payload={format:'truckload-local-backup',version:1,createdAt:new Date().toISOString(),scope:'localStorage only; uploaded PDFs/photos excluded',records};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='truckload-backup-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
   status.textContent='Backup prepared. Check Files/Downloads and save it somewhere secure. Documents are not included.';
  }catch(err){status.textContent='Could not create backup: '+err.message;}
 });
 const form=document.getElementById('supportForm');
 if(form)form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const email=document.getElementById('supportEmail').value.trim();
  const topic=document.getElementById('supportTopic').value;
  const message=document.getElementById('supportMessage').value.trim();
  if(!message)return;
  const subject='Truckload support: '+topic;
  const body='Reply-to email: '+email+'\nTopic: '+topic+'\n\n'+message+'\n\nSent by user from Truckload email composer.';
  const link='mailto:antoinettewilliams@thetruelavender.online?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  document.getElementById('supportStatus').textContent='Your email app should open. Please press Send there to submit your question.';
  window.location.href=link;
 });
})();
