import { createClient } from '@supabase/supabase-js';
const $ = id => document.getElementById(id);
const core = window.TruckloadBackup;
const config = window.TRUCKLOAD_CLOUD;
const status = $('cloudStatus');
const panel = $('cloudAccount');
let user = null, revision = null, busy = false;
const configured = !!(config?.enabled && config.url && config.publishableKey);
const client = configured ? createClient(config.url, config.publishableKey, {
  auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: true }
}) : null;
function render() {
  panel.querySelectorAll('button,input').forEach(el => { el.disabled = busy || !configured; });
  $('cloudSignedIn').hidden = !user;
  $('cloudAuthForms').hidden = !!user;
  $('cloudIdentity').textContent = user ? 'Signed in as ' + user.email : '';
  $('cloudDeleteAccount').disabled = busy || !user;
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
  if (error) throw Error('Could not load the cloud backup. Try again.');
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
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw Error('Could not send a sign-in code. ' + error.message);
    $('cloudVerifyCode').hidden = false;
    status.textContent = 'Check your email for the sign-in code. Sending another code may require waiting one minute.';
  });
};
$('cloudVerifyCode').onsubmit = event => {
  event.preventDefault(); const email = $('cloudEmail').value.trim(), token = $('cloudCode').value.trim();
  run(async () => {
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.user) throw Error('That code could not be verified. Check the code or request a new one.');
    user = data.user; $('cloudCode').value = ''; $('cloudConsent').checked = false;
    status.textContent = 'Signed in. Nothing has been uploaded. Local records stay on this device when you sign out.';
    await refreshBackup();
  });
};
$('cloudSignOut').onclick = () => run(async () => {
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
  user = null; revision = null; $('cloudConsent').checked = false;
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
  if (error || !data) { revision = null; throw Error('Backup was not confirmed. Another device may have changed it. Refresh status, check the latest backup, then retry.'); }
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
$('cloudDeleteBackup').onclick = () => run(async () => {
  const account = await currentUser();
  if (!confirm('Permanently delete your cloud backup? Local device data will remain.')) return;
  if (revision === null) throw Error('Refresh backup status first.');
  const { data, error } = await client.from('driver_backups').delete().eq('user_id', account.id).eq('revision', revision).select('user_id');
  if (error || !data?.length) throw Error('No backup was deleted. Refresh status and try again.');
  await refreshBackup(); status.textContent = 'Cloud backup deleted. Local records remain.';
});
$('cloudDeleteAccount').onclick = () => run(async () => {
  await currentUser();
  if ($('cloudDeleteConfirm').value !== 'DELETE MY ACCOUNT') throw Error('Type DELETE MY ACCOUNT to confirm.');
  if (!confirm('Permanently delete your Truckload account and cloud backup? Local records, exports and support emails will remain.')) return;
  const { data, error } = await client.functions.invoke('delete-account', { body: { confirm: 'DELETE MY ACCOUNT' } });
  if (error || !data?.deleted) throw Error('Account deletion was not confirmed. Sign in again and retry, or contact support.');
  await client.auth.signOut({ scope: 'local' });
  user = null; revision = null; $('cloudDeleteConfirm').value = '';
  status.textContent = 'Account and cloud backup deleted. Use Delete my data on this device separately if needed.';
});
render();
if (!configured) status.textContent = 'Cloud sign-in is being configured. Your local calculator and data remain available.';
