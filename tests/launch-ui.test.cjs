const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'../dist/launch-tools.js'),'utf8');
const privacy=fs.readFileSync(path.join(__dirname,'../dist/privacy.html'),'utf8');
test('privacy requests replace direct customer deletion',()=>{
 for(const id of ['confirmLocalDelete','deleteLocalData','deleteDataStatus','exportBackup'])assert.doesNotMatch(html,new RegExp('id="'+id+'"'));
 assert.match(html,/href="privacy\.html"/);
});
test('email sign-in and explicit cloud backup controls present',()=>{
 for(const id of ['cloudSendCode','cloudVerifyCode','cloudConsent','cloudSave','cloudRestore','cloudRequestAccount','cloudRequestBackup','cloudRequestRefresh'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/Backups are manual/);
 assert.match(html,/id="restorePurchases" disabled/);
});
test('support form submits to private inbox and preserves provider forwarding',()=>{
 assert.match(html,/id="supportForm"/);
 assert.match(script,/functions\/v1\/app-inbox/);
 assert.match(fs.readFileSync('supabase/functions/app-inbox/index.ts','utf8'),/https:\/\/api\.web3forms\.com\/submit/);
 assert.match(privacy,/mailto:antoinettewilliams@thetruelavender\.online/);
 assert.match(html,/Submit question/);
});
test('backup scope and privacy disclosures are explicit',()=>{
 assert.match(html,/Request deletion of support information/);
 assert.match(html,/PDFs, photos, analytics preferences and sign-in codes are excluded/);
 assert.match(privacy,/third-party content delivery networks/i);
});
