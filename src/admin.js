import {createClient} from '@supabase/supabase-js';
const $=id=>document.getElementById(id),config=window.TRUCKLOAD_CLOUD;
const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,detectSessionInUrl:false}});
let busy=false,offset=0,total=0;
function controls(){document.querySelectorAll('button,input,textarea,select').forEach(e=>e.disabled=busy);$('adminPrevious').disabled=busy||offset===0;$('adminNext').disabled=busy||offset+50>=total;}
async function run(action){if(busy)return;busy=true;controls();try{await action();}catch(e){$('adminStatus').textContent=e.message||'Request failed.';}finally{busy=false;controls();}}
async function call(body){const {data,error}=await client.functions.invoke('admin-dashboard',{body});if(error||!data)throw Error('Dashboard request was not accepted. Check administrator access and refresh before retrying.');return data;}
async function load(){
 const data=await call({action:'list',offset});total=data.total;
 $('adminPanel').hidden=false;$('adminAuth').hidden=true;
 $('adminCounts').textContent=data.backupCount+' cloud backups · '+total+' removal requests';
 const list=$('adminRequests');list.replaceChildren();if(!data.requests.length)list.textContent='No requests on this page.';
 for(const r of data.requests){
  const row=document.createElement('article');row.className='request';
  const title=document.createElement('h3');title.textContent=(r.scope==='account'?'Account deletion':'Backup removal')+' — '+r.email;
  const meta=document.createElement('p');meta.textContent='Requested '+new Date(r.created_at).toLocaleString()+' · Reference '+r.id;
  const label=document.createElement('label');label.textContent='Status';const select=document.createElement('select');
  for(const [value,text] of [['received','Received'],['in_review','Under review'],['closed','Closed']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.appendChild(option);}select.value=r.status;label.appendChild(select);
  const noteLabel=document.createElement('label');noteLabel.textContent='Note for customer (10–2000 characters)';const note=document.createElement('textarea');note.maxLength=2000;note.value=r.review_note;noteLabel.appendChild(note);
  const save=document.createElement('button');save.textContent='Save review';save.onclick=()=>run(async()=>{if(note.value.trim().length<10)throw Error('Enter a review note of at least 10 characters.');await call({action:'review',id:r.id,revision:r.revision,status:select.value,note:note.value});await load();$('adminStatus').textContent='Review saved. No customer data was deleted.';});
  row.append(title,meta,label,noteLabel,save);list.appendChild(row);
 }
}
$('adminSend').onsubmit=e=>{e.preventDefault();run(async()=>{const {error}=await client.auth.signInWithOtp({email:$('adminEmail').value.trim(),options:{shouldCreateUser:false}});if(error)throw Error('Could not send a code. Use an existing administrator account.');$('adminVerify').hidden=false;$('adminStatus').textContent='Check your email for the code.';});};
$('adminVerify').onsubmit=e=>{e.preventDefault();run(async()=>{const {error}=await client.auth.verifyOtp({email:$('adminEmail').value.trim(),token:$('adminCode').value.trim(),type:'email'});$('adminCode').value='';if(error)throw Error('Code could not be verified.');try{await load();$('adminStatus').textContent='Signed in to administration.';}catch(error){await client.auth.signOut({scope:'local'});throw error;}});};
$('adminRefresh').onclick=()=>run(async()=>{await load();$('adminStatus').textContent='Dashboard refreshed.';});
$('adminPrevious').onclick=()=>run(async()=>{offset=Math.max(0,offset-50);await load();});
$('adminNext').onclick=()=>run(async()=>{offset+=50;await load();});
$('adminSignOut').onclick=()=>run(async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;$('adminPanel').hidden=true;$('adminAuth').hidden=false;$('adminRequests').replaceChildren();$('adminCounts').textContent='';offset=0;$('adminStatus').textContent='Signed out.';});
controls();
