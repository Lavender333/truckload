'use strict';
(function(){
 const backup=document.getElementById('exportBackup');
 if(backup)backup.addEventListener('click',()=>{
  const status=document.getElementById('backupStatus');
  try{
   const records={};
   for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&(key.startsWith('sagi-')||['truckload-business-budgets','truckload-business-expenses'].includes(key)))records[key]=localStorage.getItem(key);}
   const payload={format:'truckload-local-backup',version:1,createdAt:new Date().toISOString(),scope:'localStorage only; uploaded PDFs/photos excluded',records};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='truckload-backup-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
   status.textContent='Backup prepared. Check Files/Downloads and save it somewhere secure. Documents are not included.';
  }catch(err){status.textContent='Could not create backup: '+err.message;}
 });
 const form=document.getElementById('supportForm');
 if(!form)return;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const email=document.getElementById('supportEmail').value.trim();
  const topic=document.getElementById('supportTopic').value;
  const message=document.getElementById('supportMessage').value.trim();
  const status=document.getElementById('supportStatus');
  const button=form.querySelector('button[type="submit"]');
  if(!message)return;
  button.disabled=true;status.textContent='Submitting your question…';
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('https://api.web3forms.com/submit',{
    method:'POST',
    signal:controller.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({access_key:'4966ba24-4d88-4f94-a987-2913346f8b46',email,subject:'Truckload support: '+topic,topic,message,from_name:'Truckload support form'})
   });
   if(!response.ok)throw new Error('Submission was not accepted.');
   const result=await response.json();
   if(result.success!==true)throw new Error('Submission was not confirmed.');
   status.textContent='Your question was submitted. Thank you!';
   form.reset();
  }catch(err){
   status.textContent=err.name==='AbortError'?'The email service did not respond within 12 seconds. Your message is not confirmed. Please try again later.':'We could not confirm submission. Please check your Web3Forms dashboard and try again.';
  }finally{clearTimeout(timeout);button.disabled=false;}
 });
})();
