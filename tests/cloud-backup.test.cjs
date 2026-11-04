const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../dist/backup-core.js');
function storage(initial={}){const data=new Map(Object.entries(initial));return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
test('cloud backup includes business costs and excludes credentials, consent and documents',()=>{
 const s=storage({'sagi-trips':'[{"id":"trip1"}]','truckload-business-budgets':'[{"from":"2026-11-01"}]','truckload-business-expenses':'[{"amount":20}]','sb-auth-token':'secret','truckload-analytics-consent-v1':'granted','sagi-unrecognized':'secret'});
 const p=core.capture(s);assert.equal(Object.keys(p.records).length,3);assert(!JSON.stringify(p).includes('secret'));assert(p.records['truckload-business-expenses']);
});
test('restore refuses occupied local data and never overwrites it',()=>{
 const s=storage({'sagi-trips':'[{"id":"existing"}]'}),p=core.capture(storage({'sagi-trips':'[]'}));
 assert.throws(()=>core.restoreEmpty(s,p,'driver-a'),/empty/);assert.equal(s.getItem('sagi-trips'),'[{"id":"existing"}]');
});
test('restore clears document references and binds driver ownership',()=>{
 const s=storage(),p=core.capture(storage({'sagi-trips':'[{"id":"trip1","rateconId":"old-document"}]'}));
 core.restoreEmpty(s,p,'driver-a');assert.equal(JSON.parse(s.getItem('sagi-trips'))[0].rateconId,null);
 assert.throws(()=>core.assertOwner(s,'driver-b'),/different/);core.assertOwner(s,'driver-a');
});
test('failed restore rolls back partially written data',()=>{
 const s=storage(),set=s.setItem;s.setItem=(k,v)=>{if(k==='sagi-fuel')throw Error('quota');set(k,v);};
 const p=core.capture(storage({'sagi-trips':'[]','sagi-fuel':'[]'}));assert.throws(()=>core.restoreEmpty(s,p,'a'),/failed/);
 assert.equal(s.getItem('sagi-trips'),null);assert.equal(s.getItem(core.ownerKey),null);
});
test('malformed, oversized and unknown-key backups are rejected',()=>{
 for(const payload of [{},{format:'truckload-cloud-backup',version:2,records:{}},{format:'truckload-cloud-backup',version:1,records:{'sb-auth-token':'secret'}},{format:'truckload-cloud-backup',version:1,records:{'sagi-trips':'{}'}},{format:'truckload-cloud-backup',version:1,records:{'sagi-profile':JSON.stringify({data:'x'.repeat(1900000)})}}])assert.throws(()=>core.validate(payload));
});
