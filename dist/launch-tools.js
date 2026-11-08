'use strict';
(function(){
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
