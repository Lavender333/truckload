import {createClient} from '@supabase/supabase-js';
const $=id=>document.getElementById(id),config=window.TRUCKLOAD_CLOUD;
const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,detectSessionInUrl:false}});
let busy=false,offset=0,total=0,driverOffset=0,driverTotal=0,supportOffset=0,supportTotal=0,activityOffset=0,activityTotal=0;
function controls(){document.querySelectorAll('button,input,textarea,select').forEach(e=>e.disabled=busy);for(const [prefix,start,count] of [['admin',offset,total],['drivers',driverOffset,driverTotal],['support',supportOffset,supportTotal],['activity',activityOffset,activityTotal]]){$(prefix+'Previous').disabled=busy||start===0;$(prefix+'Next').disabled=busy||start+50>=count;}}
async function run(action){if(busy)return;busy=true;controls();try{await action();}catch(e){$('adminStatus').textContent=e.message||'Request failed.';}finally{busy=false;controls();}}
async function call(body){const {data,error}=await client.functions.invoke('admin-dashboard',{body});if(error||!data)throw Error('Dashboard request was not accepted. Check administrator access and refresh before retrying.');return data;}
const date=value=>value?new Date(value).toLocaleString():'Not yet';
function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function field(title,el){const label=node('label',title);label.appendChild(el);return label;}
function reviewRow(r,kind){
 const row=document.createElement('article');row.className='request';
 row.append(node('h3',(kind==='support'?r.topic:r.scope==='account'?'Account deletion':'Backup removal')+' — '+r.email),node('p','Requested '+date(r.created_at)+' · Reference '+r.id));
 if(kind==='support')row.append(node('p',r.message),node('p','Email forwarding: '+r.email_delivery));
 const select=document.createElement('select');for(const [value,text] of [['received','Received'],['in_review','Under review'],['closed','Closed']]){const option=node('option',text);option.value=value;select.append(option);}select.value=r.status;
 const owner=document.createElement('select');for(const [value,text] of [['','Unassigned'],['truckload464@gmail.com','truckload464@gmail.com']]){const option=node('option',text);option.value=value;owner.append(option);}owner.value=r.assigned_owner||'';
 const internal=document.createElement('textarea');internal.maxLength=4000;internal.value=r.internal_note||'';
 const note=document.createElement('textarea');note.maxLength=2000;note.value=(kind==='support'?r.customer_update:r.review_note)||'';
 const save=node('button','Save review');save.onclick=()=>run(async()=>{if(note.value.trim().length<10)throw Error('Enter a review note of at least 10 characters.');await call({action:'review',kind,id:r.id,revision:r.revision,status:select.value,note:note.value,owner:owner.value,internal:internal.value});await load();$('adminStatus').textContent='Review saved. Customer update is available in the app; no email was sent and no data was deleted.';});
 row.append(field('Status',select),field('Assigned owner',owner),field('Internal notes — administrators only',internal),field('Update visible to customer (10–2000 characters)',note),save);return row;
}
async function metrics(){
 $('adminMetrics').replaceChildren();$('metricRows').replaceChildren();$('metricUpdated').textContent='Loading metrics…';
 let data;try{data=await call({action:'metrics',days:Number($('metricDays').value)});}catch(error){$('metricUpdated').textContent='Metrics unavailable. Try Refresh dashboard.';throw error;}
 const cards=$('adminMetrics');cards.replaceChildren();
 for(const [label,value,detail] of [['Website visits',data.visits,'Consenting sessions in selected period'],['Estimated visitors',data.visitors,'Distinct consenting browsers'],['Registered drivers',data.registeredTotal,'All verified accounts, excluding owner'],['New registrations',data.registeredNew,'First email verification in selected period'],['Visits today',data.visitsToday,'UTC day; consenting sessions'],['Registrations today',data.registeredToday,'UTC day; verified drivers']]){
  const card=node('div','');card.className='metric-card';card.append(node('h3',label),node('strong',Number(value).toLocaleString()),node('p',detail));cards.append(card);
 }
 const rows=$('metricRows');rows.replaceChildren();
 for(const day of data.daily.slice().reverse()){const tr=node('tr','');tr.append(node('th',day.date),node('td',String(day.visits)),node('td',String(day.registrations)));rows.append(tr);}
 $('metricUpdated').textContent='Updated '+date(data.checkedAt)+' · Last '+data.days+' calendar days (UTC)';
}
async function overview(){
 const data=await call({action:'overview',search:$('driverSearch').value.trim(),offset:driverOffset});driverTotal=data.driverTotal;
 $('adminCounts').textContent=data.driverCount+' verified driver accounts · '+data.backupCount+' accounts with backups · '+data.newDrivers+' new accounts in 30 days · '+data.pendingRequests+' pending removal requests · '+data.pendingSupport+' open support messages';
 $('adminHealth').textContent='Last checked '+date(data.checkedAt)+'. Last 24 hours: '+data.health.emailFailures24h+' reported email-code request failures; '+data.health.backupFailures24h+' reported backup failures. '+data.health.supportEmailFailures+' support email forwards failed (messages remain in the inbox).';
 const list=$('adminDrivers');list.replaceChildren(node('p',driverTotal+' matching accounts'));
 for(const r of data.drivers){const row=node('article','');row.className='request';row.append(node('h3',r.email),node('p','Created: '+date(r.created_at)),node('p','Last sign-in: '+date(r.last_sign_in_at)),node('p','Latest backup: '+date(r.saved_at)));list.append(row);}
}
async function requests(){const data=await call({action:'list',offset});total=data.total;const list=$('adminRequests');list.replaceChildren();if(!data.requests.length)list.textContent='No requests on this page.';for(const r of data.requests)list.append(reviewRow(r,'removal'));}
async function support(){const data=await call({action:'support',offset:supportOffset});supportTotal=data.total;const list=$('adminSupport');list.replaceChildren();if(!data.rows.length)list.textContent='No support messages on this page.';for(const r of data.rows)list.append(reviewRow(r,'support'));}
async function activity(){const data=await call({action:'activity',offset:activityOffset});activityTotal=data.total;const list=$('adminActivity');list.replaceChildren();if(!data.rows.length)list.textContent='No administrator changes recorded yet.';for(const r of data.rows){const row=node('article','');row.className='request';row.append(node('h3',r.actor_email+' · '+date(r.created_at)),node('p',r.kind+' '+r.item_id+' · '+r.details.status),node('p','Assigned to: '+(r.details.assigned_owner||'Unassigned')),node('p','Customer update: '+r.details.customer_update),node('p','Internal note: '+r.details.internal_note));list.append(row);}}
async function outages(){
 const list=$('adminOutages');list.textContent='Checking provider incident feed…';
 try{const response=await fetch('https://status.supabase.com/api/v2/incidents.json',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();const data=await response.json();list.replaceChildren();for(const r of data.incidents.slice(0,5)){const p=node('p',r.name+' · '+r.status+' · '+date(r.updated_at));list.append(p);}if(!data.incidents.length)list.textContent='No incidents listed by the provider.';}
 catch{list.textContent='Provider incident feed unavailable. Open the Supabase status page for current information.';}
}
async function load(){try{await metrics();}catch{}await overview();await requests();await support();await activity();$('adminPanel').hidden=false;$('adminAuth').hidden=true;}
$('adminSend').onsubmit=e=>{e.preventDefault();run(async()=>{const {error}=await client.auth.signInWithOtp({email:$('adminEmail').value.trim(),options:{shouldCreateUser:false}});if(error)throw Error('Could not send a code. Use an existing administrator account.');$('adminVerify').hidden=false;$('adminStatus').textContent='Check your email for the code.';});};
$('adminVerify').onsubmit=e=>{e.preventDefault();run(async()=>{const {error}=await client.auth.verifyOtp({email:$('adminEmail').value.trim(),token:$('adminCode').value.trim(),type:'email'});$('adminCode').value='';if(error)throw Error('Code could not be verified.');try{await load();void outages();$('adminStatus').textContent='Signed in to administration.';}catch(error){await client.auth.signOut({scope:'local'});clearPrivate();throw error;}});};
$('adminRefresh').onclick=()=>run(async()=>{await load();void outages();$('adminStatus').textContent='Dashboard refreshed.';});
$('metricDays').onchange=()=>run(metrics);
$('driverLookup').onsubmit=e=>{e.preventDefault();run(async()=>{driverOffset=0;await overview();});};
for(const direction of ['Previous','Next']){const delta=direction==='Next'?50:-50;
 $('admin'+direction).onclick=()=>run(async()=>{offset=Math.max(0,offset+delta);await requests();});
 $('drivers'+direction).onclick=()=>run(async()=>{driverOffset=Math.max(0,driverOffset+delta);await overview();});
 $('support'+direction).onclick=()=>run(async()=>{supportOffset=Math.max(0,supportOffset+delta);await support();});
 $('activity'+direction).onclick=()=>run(async()=>{activityOffset=Math.max(0,activityOffset+delta);await activity();});
}
function clearPrivate(){for(const id of ['adminMetrics','metricRows','metricUpdated','adminRequests','adminCounts','adminDrivers','adminHealth','adminSupport','adminActivity','adminOutages'])$(id).replaceChildren();$('adminPanel').hidden=true;$('adminAuth').hidden=false;offset=driverOffset=supportOffset=activityOffset=0;$('driverSearch').value='';}
$('adminSignOut').onclick=()=>run(async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;clearPrivate();$('adminStatus').textContent='Signed out.';});
controls();
