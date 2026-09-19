import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
process.env.DISABLE_BACKGROUND='1';
const memory=await import('../src/lib/server/memory.ts');
const wf=await import('../src/lib/server/workflows.ts');
const workspaceId=`live-workflows-${Date.now()}`;
const ctx=memory.context(workspaceId,'ana');
const results:any[]=[];
async function step(name:string,fn:()=>Promise<unknown>){const start=Date.now();try{const result=await fn();results.push({name,status:'passed',seconds:(Date.now()-start)/1000,result});}catch(error){results.push({name,status:'failed',seconds:(Date.now()-start)/1000,error:error instanceof Error?error.message:String(error)});}writeFileSync('docs/live_workflows.json',JSON.stringify({workspaceId,results},null,2));console.log(name,results.at(-1)?.status,results.at(-1)?.seconds);}
await step('Routine email receipt and calendar update',async()=>{
 const mail=wf.sendMail(ctx,{id:'schedule',threadId:'emails/19_meridian-environment-access',subject:'Re: Meridian - environment access',to:['priya.nair@acme-org.example'],cc:['n.haddad@relexsolutions.example',wf.AGENT_EMAIL],body:"For everyone's calendar: I have scheduled the bakery evidence review for Thursday 9 July 2026 at 10:00 Helsinki time. I will prepare the comparison of prepared extracts and a separate environment, including the earlier access decision and setup estimate. Priya, please bring updated requirements from Acme. Nadia, please bring the current integration questions.\n\nAna"});
 await wf.processMail(ctx,mail.id);const data=wf.workspaceData(ctx);const result=data.mails.find(m=>m.id===mail.id)!;assert.equal(result.status,'Memory updated');assert.ok(data.meetings.some(m=>m.id==='meeting-schedule'&&m.date.includes('2026-07-09')));return {status:result.status,meetings:data.meetings};
});
await step('New email answers a previously unavailable question',async()=>{
 const answer=await wf.answerQuestion(ctx,'When is the bakery evidence review, and what did I say I would prepare?');assert.ok(answer.citations.some(c=>c.sourceId==='runtime/schedule'));assert.match(answer.text,/9 July|July 9|2026-07-09/);return answer;
});
await step('Consequential UAT scope error triggers a supported reply',async()=>{
 const mail=wf.sendMail(ctx,{id:'scope',threadId:'emails/15_uat-signoff',subject:'Re: UAT sign-off - core replenishment',to:['lena.fischer@acme-org.example'],cc:['marco.rossi@relexsolutions.example',wf.AGENT_EMAIL],body:'Lena,\nFor the steering pack I have described the January 2025 sign-off as acceptance of the whole programme, including fresh categories. I am carrying that wording into the approval summary.\nAna'});
 await wf.processMail(ctx,mail.id);const data=wf.workspaceData(ctx);const reply=data.mails.find(m=>m.id==='reply-scope');assert.ok(reply?.answer?.citations.length);assert.match(reply.body,/25/);assert.match(reply.body,/fresh/i);await wf.processMail(ctx,mail.id);assert.equal(wf.workspaceData(ctx).mails.filter(m=>m.id==='reply-scope').length,1);return reply;
});
await step('Updated morning brief cites new scheduling evidence',async()=>{const answer=await wf.generateBrief(ctx);assert.ok(answer.citations.some(c=>c.sourceId==='runtime/schedule'));return answer;});
await step('Fresh customer evidence card',async()=>{const answer=await wf.answerQuestion(memory.context(workspaceId,'ana',1),'What did Acme approve in the January 2025 UAT sign-off?','share');assert.equal(answer.level,1);assert.ok(answer.citations.length);return answer;});
await step('Evidence-backed stakeholder guidance',async()=>{const answer=await wf.answerQuestion(ctx,'Prepare stakeholder guidance for Robert Kahn: observed priorities and reactions, followed by clearly labelled recommendations for the next conversation.','guidance');assert.ok(answer.citations.length);return answer;});
console.log('workspace',workspaceId);
