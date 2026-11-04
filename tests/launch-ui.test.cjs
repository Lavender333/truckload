const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'../dist/launch-tools.js'),'utf8');
const privacy=fs.readFileSync(path.join(__dirname,'../dist/privacy.html'),'utf8');
test('privacy and deletion controls present',()=>{
 for(const id of ['confirmLocalDelete','deleteLocalData','deleteDataStatus'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/href="privacy\.html"/);
});
test('email sign-in and explicit cloud backup controls present',()=>{
 for(const id of ['cloudSendCode','cloudVerifyCode','cloudConsent','cloudSave','cloudRestore','cloudDeleteAccount'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/not automatic sync/);
 assert.match(html,/id="restorePurchases" disabled/);
});
test('support form submits directly to external provider',()=>{
 assert.match(html,/id="supportForm"/);
 assert.match(script,/https:\/\/api\.web3forms\.com\/submit/);
 assert.match(html,/mailto:antoinettewilliams@thetruelavender\.online/);
 assert.match(html,/Submit question/);
});
test('backup scope and privacy disclosures are explicit',()=>{
 assert.match(script,/scope:'localStorage only/);
 assert.match(html,/does NOT include uploaded rate-confirmation PDFs/);
 assert.match(privacy,/third-party content delivery networks/i);
});
