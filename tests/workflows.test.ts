import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const dir=mkdtempSync(resolve(tmpdir(),'relex-workflow-'));process.env.DATA_DIR=dir;process.env.DISABLE_BACKGROUND='1';
const memory=await import('../src/lib/server/memory');
const wf=await import('../src/lib/server/workflows');
const {bindCitations}=await import('../src/lib/server/model');
// Background inference is disabled by keeping mutations within one synchronous test turn.
test('mail delivery is recipient-scoped, idempotent and separate from shared evidence',()=>{
 const ctx=memory.context('delivery','ana');
 const first=wf.sendMail(ctx,{id:'private-1',subject:'Private simulator detail',to:['lena.fischer@acme-org.example'],cc:[],body:'Secret meeting at 14:37 under reference AMBER-712.'});
 assert.equal(first.status,'Sent in simulator');
 assert.equal(memory.sources(ctx).some(s=>s.text.includes('AMBER-712')),false);
 const second=wf.sendMail(ctx,{id:'private-1',subject:'ignored duplicate',to:['lena.fischer@acme-org.example'],cc:[],body:'Duplicate'});
 assert.equal(second.body,first.body);
 const delivered=wf.sendMail(ctx,{id:'delivered-1',threadId:first.threadId,subject:'New message',to:['lena.fischer@acme-org.example'],cc:[wf.AGENT_EMAIL],body:'This new message contains BETA-915 only.'});
 assert.equal(delivered.level,1);
 assert.equal(wf.workspaceData(ctx).mails.filter(m=>m.id==='private-1').length,1);
 assert.equal(wf.workspaceData(memory.context('delivery','marco')).mails.some(m=>m.id==='private-1'),false);
 assert.equal(wf.workspaceData(ctx).jobs.length,1);
});
test('personal memory is owner-isolated and erased identities cannot be saved',()=>{
 const ctx=memory.context('private-memory','ana');
 wf.savePreference(ctx,'Follow bakery access decisions.');
 assert.equal(wf.preferences(ctx).length,1);
 assert.equal(wf.preferences(memory.context('private-memory','marco')).length,0);
 const kwame=memory.people(ctx).find(p=>p.name==='Kwame Boateng');assert.ok(kwame);
 wf.savePreference(ctx,'Discuss delivery with Kwame Boateng.');
 wf.erase(ctx,kwame.id);
 const refreshed=memory.context('private-memory','ana');
 assert.equal(wf.preferences(refreshed).length,1);
 assert.throws(()=>wf.savePreference(refreshed,'Ask Kwame Boateng again'),/erased/);
 assert.throws(()=>wf.savePreference(ctx,'stale write'),/changed/);
});
test('citation binding rejects unknown sources and fabricated quotes',()=>{
 const ctx=memory.context('citations','ana');const source=memory.sources(ctx)[0];
 assert.equal(bindCitations([{sourceId:source.id,quote:source.text.slice(0,40)}],[source]).length,1);
 assert.equal(bindCitations([{sourceId:source.id,quote:'fabricated passage'}],[source]).length,0);
 assert.equal(bindCitations([{sourceId:'hidden',quote:source.text.slice(0,40)}],[source]).length,0);
});
test.after(()=>rmSync(dir,{recursive:true,force:true}));

test('delivery replay checks owner, and preparation jobs remain access-level specific',()=>{
 const ana=memory.context('replay-owner','ana');
 wf.sendMail(ana,{id:'private-owner-event',subject:'Private reminder',to:['lena.fischer@acme-org.example'],cc:[],body:'Private MAIL-OWNER-CANARY.'});
 assert.throws(()=>wf.sendMail(memory.context('replay-owner','marco'),{id:'private-owner-event',subject:'replay',to:['lena.fischer@acme-org.example'],cc:[],body:'replay'}),/another employee/);
 const high=wf.queueJob(ana,'brief');const low=wf.queueJob(memory.context('replay-owner','ana',1),'brief');assert.notEqual(high,low);
});
test('deleting an employee removes unnamed personal preferences owned by that employee',()=>{
 const ctx=memory.context('owner-erasure','ana');wf.savePreference(ctx,'My private goal has no name in its text.');
 const person=memory.people(ctx).find(p=>p.name==='Ana Duarte');assert.ok(person);wf.erase(ctx,person.id);
 assert.deepEqual(wf.preferences(memory.context('owner-erasure','ana')),[]);
});
test('same-owner replay respects a lowered access view',()=>{
 const ctx=memory.context('replay-level','ana');wf.sendMail(ctx,{id:'internal-event',subject:'Internal',to:['marco.rossi@relexsolutions.example'],cc:[],body:'INTERNAL-ONLY replay check.'});
 assert.throws(()=>wf.sendMail(memory.context('replay-level','ana',1),{id:'internal-event',subject:'Replay',to:['marco.rossi@relexsolutions.example'],cc:[],body:'Replay'}),/current access level/);
});
