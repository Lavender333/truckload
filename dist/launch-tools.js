'use strict';
(function(){
 let requestId=null,lastContent='';
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
  const content=JSON.stringify({email,topic,message});
  if(content!==lastContent||!requestId){requestId=crypto.randomUUID();lastContent=content;}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(window.TRUCKLOAD_CLOUD.url+'/functions/v1/app-inbox',{
    method:'POST',
    signal:controller.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json','apikey':window.TRUCKLOAD_CLOUD.publishableKey},
    body:JSON.stringify({action:'support',id:requestId,email,topic,message})
   });
   if(!response.ok)throw new Error('Submission was not accepted.');
   const result=await response.json();
   if(result.success!==true)throw new Error('Submission was not confirmed.');
   status.textContent='Your question was submitted to Truckload support. Sign in with this email to see updates under Account & privacy.';
   form.reset();requestId=null;
  }catch(err){
   status.textContent=err.name==='AbortError'?'The support service did not respond within 12 seconds. Your message is not confirmed. Please try again later.':'We could not confirm submission. Your message is still here. Please try again.';
  }finally{clearTimeout(timeout);button.disabled=false;}
 });
})();
