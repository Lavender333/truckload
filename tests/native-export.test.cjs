const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('native/file-export.js','utf8').replace(/^import .*;\n/gm,'');
function setup({native=true,failWrite=false,failShare=false}={}){
 const calls=[];
 const ctx={window:{},Capacitor:{isNativePlatform:()=>native},Directory:{Cache:'CACHE'},crypto:{randomUUID:()=> 'unique'},
 Filesystem:{writeFile:async o=>{calls.push(['write',o]);if(failWrite)throw Error('full');return {uri:'file:///cache/export'}},deleteFile:async o=>calls.push(['delete',o])},
 Share:{share:async o=>{calls.push(['share',o]);if(failShare)throw Error('cancelled')}},
 FileReader:class{readAsDataURL(){this.result='data:text/plain;base64,dGVzdA==';this.onload()}},
 URL:{createObjectURL:()=> 'blob:export',revokeObjectURL:u=>calls.push(['revoke',u])},
 document:{createElement:()=>({click(){calls.push(['download',this.download])},remove(){}}),body:{append(){}}},
 setTimeout:f=>f()};vm.runInNewContext(source,ctx);return {run:ctx.window.truckloadExport,calls};
}
test('native export shares cached bytes then removes temporary file',async()=>{const {run,calls}=setup();await run('../load.csv',{});assert.deepEqual(calls.map(c=>c[0]),['write','share','delete']);assert.equal(calls[0][1].data,'dGVzdA==');assert.equal(calls[0][1].path,'truckload-exports/unique/.._load.csv');assert.equal(calls[1][1].files[0],'file:///cache/export');});
test('cancelled share cleans up and reports rejection',async()=>{const {run,calls}=setup({failShare:true});await assert.rejects(run('trip.csv',{}),/cancelled/);assert.equal(calls.at(-1)[0],'delete');});
test('failed write never attempts sharing',async()=>{const {run,calls}=setup({failWrite:true});await assert.rejects(run('trip.csv',{}),/full/);assert(!calls.some(c=>c[0]==='share'));});
test('web export downloads without touching native storage',async()=>{const {run,calls}=setup({native:false});await run('trip.csv',{});assert.deepEqual(calls.map(c=>c[0]),['download','revoke']);});
