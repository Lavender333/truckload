import { createClient } from '@supabase/supabase-js';
const $ = id => document.getElementById(id);
const core = window.TruckloadBackup;
const config = window.TRUCKLOAD_CLOUD;
const status = $('cloudStatus');
const panel = $('cloudAccount');
let user = null, revision = null, busy = false, settingPassword = false;
const configured = !!(config?.enabled && config.url && config.publishableKey);
const client = configured ? createClient(config.url, config.publishableKey, {
  auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: true }
}) : null;
function render() {
  panel.querySelectorAll('button,input,select').forEach(el => { el.disabled = busy || !configured; });
  $('cloudSignedIn').hidden = !user || settingPassword;
  $('cloudSetPassword').hidden = !settingPassword;
  $('cloudAuthForms').hidden = !!user || settingPassword;
  $('cloudIdentity').textContent = user ? 'Signed in as ' + user.email : '';
  $('cloudRequestAccount').disabled = busy || !user;
}
async function run(action) {
  if (busy || !client) return;
  busy = true; render();
  try { await action(); } catch (error) { status.textContent = error.message || 'Could not complete the request. Try again.'; }
  finally { busy = false; render(); }
}
async function currentUser() {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw Error('Please sign in again.');
  if (!user || data.user.id !== user.id) throw Error('Account changed. Sign in again before continuing.');
  return data.user;
}
async function refreshBackup() {
  const { data, error } = await client.from('driver_backups').select('revision,saved_at').eq('user_id', user.id).maybeSingle();
  if (error) { revision = null; throw Error('Could not check the cloud backup. Please refresh its status before saving.'); }
  revision = data?.revision || 0;
  $('cloudBackupInfo').textContent = data ? 'Latest backup: ' + new Date(data.saved_at).toLocaleString() : 'No cloud backup saved yet.';
}
async function getBackup() {
  const account = await currentUser();
  const { data, error } = await client.from('driver_backups').select('payload,revision').eq('user_id', account.id).maybeSingle();
  if (error) { reportFailure('backup_failed'); throw Error('Could not load the cloud backup. Try again.'); }
  if (!data) throw Error('No cloud backup is available.');
  core.validate(data.payload);
  return data.payload;
}
function download(payload) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'truckload-cloud-backup.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('cloudSendCode').onsubmit = event => {
  event.preventDefault(); const email = $('cloudEmail').value.trim();
  run(async () => {
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: $('cloudAuthMode').value === 'create' } });
    if (error) { reportFailure('email_request_failed'); throw Error('Could not send a verification code. Please wait before trying again.'); }
    $('cloudVerifyCode').hidden = false;
    status.textContent = 'Check your email for the sign-in code. Sending another code may require waiting one minute.';
  });
};
$('cloudVerifyCode').onsubmit = event => {
  event.preventDefault(); const email = $('cloudEmail').value.trim(), token = $('cloudCode').value.trim();
  run(async () => {
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.user) throw Error('That code could not be verified. Check the code or request a new one.');
    user = data.user; settingPassword = true; $('cloudCode').value = ''; $('cloudConsent').checked = false;
    status.textContent = 'Email verified. Choose your password to continue.';
  });
};
async function reportFailure(kind) {
 try { await client.functions.invoke('app-inbox',{body:{action:'event',kind}}); } catch {} // Best effort, no business data or credentials.
}
async function signedIn() {
 $('cloudConsent').checked=false;
 status.textContent='Signed in. Nothing has been uploaded.';
 await refreshBackup(); await refreshRequests();
}
$('cloudPasswordLogin').onsubmit=event=>{event.preventDefault();run(async()=>{
 const {data,error}=await client.auth.signInWithPassword({email:$('cloudLoginEmail').value.trim(),password:$('cloudLoginPassword').value});
 $('cloudLoginPassword').value='';
 if(error||!data.user)throw Error('Could not sign in. Check your email and password, or use Set or reset password.');
 user=data.user;settingPassword=false;await signedIn();
});};
$('cloudSetPassword').onsubmit=event=>{event.preventDefault();run(async()=>{
 const password=$('cloudNewPassword').value;
 if(password.length<12||password.length>128||password!==$('cloudConfirmPassword').value)throw Error('Use at least 12 characters and enter the same password twice.');
 const {error}=await client.auth.updateUser({password});
 if(error)throw Error('Password could not be saved. Choose another password or verify a fresh code.');
 $('cloudNewPassword').value='';$('cloudConfirmPassword').value='';settingPassword=false;await signedIn();
});};
$('cloudCancelPassword').onclick=()=>run(async()=>{await client.auth.signOut({scope:'local'});user=null;settingPassword=false;$('cloudNewPassword').value='';$('cloudConfirmPassword').value='';status.textContent='Password setup cancelled. Verify a new code to try again.';});
$('cloudSignOut').onclick = () => run(async () => {
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
  user = null; revision = null; settingPassword = false; $('cloudSupportUpdates').replaceChildren(); $('cloudRequests').replaceChildren(); $('cloudConsent').checked = false;
  status.textContent = 'Signed out. Local trips and documents remain on this device. Use your own device.';
});
$('cloudRefresh').onclick = () => run(async () => { await currentUser(); await refreshBackup(); status.textContent = 'Cloud backup status refreshed.'; });
$('cloudSave').onclick = () => run(async () => {
  const account = await currentUser();
  if (!$('cloudConsent').checked) throw Error('Confirm the backup contents and destination first.');
  core.assertOwner(localStorage, account.id);
  if (revision === null) throw Error('Refresh cloud backup status before saving.');
  const payload = core.capture(localStorage);
  if (!confirm('Save these device records to ' + account.email + '’s private cloud backup? This replaces your previous cloud backup. PDFs and photos are excluded.')) return;
  // Bind before sending so failure cannot accidentally allow another account to upload these records.
  localStorage.setItem(core.ownerKey, account.id);
  const values = { user_id: account.id, payload, consent_version: '2026-11-04' };
  const query = revision === 0 ? client.from('driver_backups').insert(values) :
    client.from('driver_backups').update(values).eq('user_id', account.id).eq('revision', revision);
  const { data, error } = await query.select('revision,saved_at').maybeSingle();
  if (error || !data) { reportFailure('backup_failed'); revision = null; throw Error('Backup was not confirmed. Another device may have changed it. Refresh status, check the latest backup, then retry.'); }
  revision = data.revision;
  $('cloudBackupInfo').textContent = 'Latest backup: ' + new Date(data.saved_at).toLocaleString();
  status.textContent = 'Cloud backup saved. Keep original PDFs and photos separately.';
});
$('cloudDownload').onclick = () => run(async () => { download(await getBackup()); status.textContent = 'Download prepared. Check Files/Downloads and keep it secure.'; });
$('cloudRestore').onclick = () => run(async () => {
  const payload = await getBackup();
  if (!confirm('Restore this cloud backup onto this device? This is available only when local records are empty. Documents are not restored.')) return;
  core.restoreEmpty(localStorage, payload, user.id);
  location.hash = 'account'; location.reload();
});
async function refreshRequests() {
 const support=await client.functions.invoke('app-inbox',{body:{action:'my-support'}});
 const updates=$('cloudSupportUpdates');updates.replaceChildren();
 if(support.error){updates.textContent='Support updates unavailable. Refresh request status to retry.';}
 for(const r of support.data?.rows||[]){const p=document.createElement('p');p.textContent=r.topic+' — '+r.status+(r.customer_update?' · '+r.customer_update:'');updates.appendChild(p);}
 const {data,error}=await client.from('deletion_requests').select('id,scope,status,created_at,review_note').order('created_at',{ascending:false}).limit(20);
 if(error)throw Error('Could not load removal requests. Try Refresh request status.');
 const list=$('cloudRequests');list.replaceChildren();
 if(!data.length){list.textContent='No removal requests submitted.';return;}
 for(const request of data){const row=document.createElement('p');row.textContent=(request.scope==='account'?'Account deletion':'Backup removal')+' — '+({received:'Received',in_review:'Under review',closed:'Closed'}[request.status]||request.status)+' · '+new Date(request.created_at).toLocaleDateString()+(request.review_note?' · '+request.review_note:'');list.appendChild(row);}
}
async function requestRemoval(scope) {
 await currentUser();
 if(scope==='account'&&!$('cloudRequestConfirm').checked)throw Error('Confirm that you want to request account deletion first.');
 if(!confirm('Submit a '+(scope==='account'?'account deletion':'backup removal')+' request for review? No data is erased now.'))return;
 const {data,error}=await client.functions.invoke('delete-account',{body:{confirm:'REQUEST DELETION',scope}});
 if(error||!data?.requested)throw Error('Request was not confirmed. Please try again.');
 status.textContent='Request received. Your records have not been deleted. You can check progress below.';
 $('cloudRequestConfirm').checked=false;
 await refreshRequests();
}
$('cloudRequestBackup').onclick=()=>run(()=>requestRemoval('backup'));
$('cloudRequestAccount').onclick=()=>run(()=>requestRemoval('account'));
$('cloudRequestRefresh').onclick=()=>run(async()=>{await currentUser();await refreshRequests();status.textContent='Request status refreshed.';});
render();
if (!configured) status.textContent = 'Cloud sign-in is being configured. Your local calculator and data remain available.';
