import { randomUUID } from 'node:crypto';
import { database } from './database';
import * as memory from './memory';
import { resolveReference, cancelModelCalls, bindCitations, evidenceRules, evidenceText, modelJSON } from './model';
import type { Answer, Claim, Context, Job, Level, Mail, Meeting, Preference, Source, WorkspaceData } from '../types';

export const AGENT_EMAIL = 'acme-memory@relexsolutions.example';
export const archiveDate = '2026-07-02';
const now = () => new Date().toISOString();
let initialized = false;
let scheduler: ReturnType<typeof setInterval> | undefined;
function requireCurrent(ctx:Context){if(memory.epoch(ctx.workspaceId)!==ctx.epoch||!ctx.persona.projects.includes(ctx.projectId))throw new Error('Project access changed. Reload before continuing.');}

function db() {
 const d = database();
 if (!initialized) {
  d.exec(`CREATE TABLE IF NOT EXISTS wf_artifacts(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,level INTEGER NOT NULL,epoch INTEGER NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wf_preferences(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wf_mail(id TEXT NOT NULL,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(workspace_id,id));
  CREATE TABLE IF NOT EXISTS wf_meetings(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,level INTEGER NOT NULL,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wf_jobs(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,error TEXT,created_at TEXT NOT NULL, UNIQUE(workspace_id,owner,kind,status));`);
  d.prepare("UPDATE wf_jobs SET status='failed',error='Application restarted. Retry this task.' WHERE status='running'").run();
  memory.registerErasureHook((workspaceId:string, aliases:string[], sourceIds:string[])=> {
   cancelModelCalls(workspaceId);
   let count = 0;
   const erasedOwners=memory.personas.filter(p=>aliases.some(alias=>[p.name,p.email].some(value=>value.toLowerCase()===alias.toLowerCase()))).map(p=>p.id);
   for (const table of ['wf_artifacts','wf_preferences','wf_mail','wf_jobs','wf_meetings']) {
    const rows = d.prepare(`SELECT id,payload${table==='wf_meetings'?'':',owner'} FROM ${table} WHERE workspace_id=?`).all(workspaceId);
    for (const row of rows) {
     const text = String(row.payload).toLocaleLowerCase();
     const personal = aliases.some(alias=>text.includes(alias.toLocaleLowerCase()));
     if (table === 'wf_artifacts' || table === 'wf_jobs' || erasedOwners.includes(String(row.owner||'')) || personal || sourceIds.some(id=>text.includes(id.toLowerCase()))) {
      d.prepare(`DELETE FROM ${table} WHERE workspace_id=? AND id=?`).run(workspaceId,String(row.id)); count++;
     }
    }
   }
   return count;
  });
  initialized = true;
  scheduler ||= setInterval(()=>{void scheduledRefresh();},60_000);
  scheduler.unref();
 }
 return d;
}
function saveArtifact(ctx:Context, answer:Answer) {
 if(memory.isSuppressed(ctx.workspaceId,JSON.stringify(answer))) throw new Error('Generated content refers to erased personal information. Retry with surviving evidence.');
 if(memory.epoch(ctx.workspaceId)!==ctx.epoch) throw new Error('Project memory changed during generation. Please retry.');
 db().prepare('INSERT INTO wf_artifacts VALUES(?,?,?,?,?,?,?)').run(answer.id,ctx.workspaceId,ctx.persona.id,ctx.level,ctx.epoch,answer.kind,JSON.stringify(answer));
 return answer;
}
function artifacts(ctx:Context, kind?:string):Answer[] {
 return db().prepare('SELECT payload FROM wf_artifacts WHERE workspace_id=? AND owner=? AND level<=? AND epoch=? ORDER BY rowid DESC').all(ctx.workspaceId,ctx.persona.id,ctx.level,ctx.epoch).map(r=>JSON.parse(String(r.payload)) as Answer).filter(a=>!kind||a.kind===kind);
}
export function preferences(ctx:Context):Preference[] {
 return db().prepare('SELECT payload FROM wf_preferences WHERE workspace_id=? AND owner=? ORDER BY rowid').all(ctx.workspaceId,ctx.persona.id).map(r=>JSON.parse(String(r.payload)));
}
export function savePreference(ctx:Context,text:string,id?:string) {
 requireCurrent(ctx);
 if(memory.isSuppressed(ctx.workspaceId,text)) throw new Error('This preference contains erased personal information.');
 if(!text.trim()||text.length>2000) throw new Error('Enter a preference between 1 and 2,000 characters.');
 const item={id:id||randomUUID(),text:text.trim(),createdAt:now()};
 if(id) db().prepare('DELETE FROM wf_preferences WHERE workspace_id=? AND owner=? AND id=?').run(ctx.workspaceId,ctx.persona.id,id);
 db().prepare('INSERT INTO wf_preferences VALUES(?,?,?,?)').run(item.id,ctx.workspaceId,ctx.persona.id,JSON.stringify(item));
 queueJob(ctx,'brief'); return item;
}
export function forgetPreference(ctx:Context,id:string) {
 requireCurrent(ctx);
 db().prepare('DELETE FROM wf_preferences WHERE workspace_id=? AND owner=? AND id=?').run(ctx.workspaceId,ctx.persona.id,id);
 queueJob(ctx,'brief');
}
export const meetings:Meeting[]=[{id:'bakery',title:'Acme project check-in',date:'2026-07-08T10:00:00+03:00',attendees:['Ana Duarte','Priya Nair','Nadia Haddad'],purpose:'Review bakery integration, prepared extracts and outstanding Acme decisions.'}];
interface ModelAnswer { text:string; citations:{sourceId:string;quote:string}[]; trace?:string[]; remember?:string; intent?:string; participate?:boolean; meeting?:Meeting }
async function verifyDraft(draft:ModelAnswer,question:string,permitted:Source[],ctx:Context){
 draft={...draft,citations:(draft.citations||[]).map(c=>({...c,sourceId:resolveReference(c.sourceId,permitted)}))};
 const allowedIds=new Set(permitted.map(s=>s.id));
 const candidateIds=new Set((draft.citations||[]).map(c=>c.sourceId).filter(id=>allowedIds.has(id)));
 // Transcript exports split sentences across turns. Include neighbouring source records for verification.
 for(const id of [...candidateIds]){const index=permitted.findIndex(s=>s.id===id);if(index<0)continue;for(let j=Math.max(0,index-3);j<=Math.min(permitted.length-1,index+3);j++){if(permitted[j].documentId===permitted[index].documentId)candidateIds.add(permitted[j].id);}}
 const candidates=candidateIds.size?permitted.filter(s=>candidateIds.has(s.id)):permitted;
 const checked=candidates.length?await modelJSON<{statements:{text:string;sourceIds:string[];evidenceGap?:boolean}[];trace?:string[]}>(evidenceRules,`Verify this draft against the supplied source passages at claim level. Question: ${question}\nDraft: ${JSON.stringify(draft)}\nRemove or qualify factual statements these passages do not support. Preserve attribution, dates, scope, and missing attachments. Verify every numerical value appears in the cited passages. A speaker starting an interrupted number has not stated the completed number: attribute the completion to the speaker who actually said it. Add the exact source turn containing each number and approval. Do not infer a category mapping from delivery-cycle wording. A sentence fragmented across transcript turns needs every supporting turn. Return {"statements":[{"text":"one readable paragraph with no numeric citation markers","sourceIds":["exact supporting source ID"],"evidenceGap":false}],"trace":["brief verification observations"]}. Return only the final user-facing answer; omit commentary about the draft, verification, editing or removed claims. Group related facts into short paragraphs. Each factual paragraph must name its supporting IDs. Recommendations must cite the observed basis. Use an empty sourceIds list only for a clearly labelled evidence gap, with evidenceGap:true. A factual assertion or recommendation requires supporting source IDs. The application assigns citation numbers deterministically and attaches each exact original passage. Source passages:\n${evidenceText(candidates)}`,()=>requireCurrent(ctx),ctx.workspaceId,true,3):{statements:[{text:draft.text,sourceIds:[]}],trace:draft.trace};
 if(!Array.isArray(checked.statements)||!checked.statements.length)throw new Error('Source verification returned an incomplete answer. Retry.');
 for(const statement of checked.statements)statement.sourceIds=(statement.sourceIds||[]).map(id=>resolveReference(id,permitted));
 const byId=new Map(candidates.map(s=>[s.id,s]));
 const ids=[...new Set(checked.statements.flatMap(statement=>statement.sourceIds||[]))];
 const citations=ids.map(id=>{const source=byId.get(id);if(!source)throw new Error('A citation references an unavailable source. Retry.');return {sourceId:source.id,quote:source.text,title:source.title,date:source.date,author:source.author,position:source.position};});
 const text=checked.statements.map(statement=>{
  if(!(statement.sourceIds||[]).length&&!statement.evidenceGap)throw new Error('A factual paragraph lacks verified source support. Please retry or narrow the question.');
  if(typeof statement.text!=='string')throw new Error('Source verification returned an incomplete paragraph.');
  const clean=statement.text.replace(/\[\d+(?:,\s*\d+)*\]/g,'').trim();
  return `${clean}${(statement.sourceIds||[]).map(id=>` [${ids.indexOf(id)+1}]`).join('')}`;
 }).join('\n\n');
 const result:ModelAnswer={text,citations,trace:checked.trace,remember:draft.remember};
 return {result,citations};
}
export async function answerQuestion(ctx:Context,question:string,kind='chat'):Promise<Answer> {
 if(memory.isSuppressed(ctx.workspaceId,question)) throw new Error('This question contains identifying information erased from this workspace. Rephrase without that identity.');
 if(!question.trim()||question.length>8000) throw new Error('Enter a question of up to 8,000 characters.');
 const permitted=memory.sources(ctx);
 if(!permitted.length)return saveArtifact(ctx,{id:randomUUID(),text:'No source records are available for this project and access level.',citations:[],createdAt:now(),kind,level:ctx.level,question,trace:['Checked project membership and permitted source records.']});
 const privateAllowed=kind==='chat'||kind==='brief'||kind==='guidance'||kind==='meeting';
 const privateContext=privateAllowed?`Employee: ${ctx.persona.name}, ${ctx.persona.role}. Private preferences: ${JSON.stringify(preferences(ctx))}. Recent private conversation: ${JSON.stringify(artifacts(ctx,'chat').slice(0,4).reverse().map(a=>({question:a.question,answer:a.text})))}`:'';
 const prompt=`Task: ${question}\n${privateContext}\nReturn {"text":"answer with inline [1] citations", "citations":[{"sourceId":"existing-id","quote":"exact supporting passage"}],"trace":["concise observable evidence checks"],"remember":"only if user explicitly asks to remember/follow a preference, otherwise empty","intent":"personal_memory only for a question about the employee own remembered preferences; otherwise project"}. Only use supplied project evidence for facts.\nPermitted evidence records:\n${evidenceText(permitted)}`;
 const draft=await modelJSON<ModelAnswer>(evidenceRules,prompt,()=>requireCurrent(ctx),ctx.workspaceId,false,kind==='chat'||kind==='share'?3:1);
 if(!draft.text||typeof draft.text!=='string')throw new Error('The model returned an incomplete answer. Retry.');
 requireCurrent(ctx);
 if(kind==='chat'&&draft.remember?.trim()&&!(draft.citations||[]).some(c=>permitted.some(source=>source.id===resolveReference(c.sourceId,permitted)))){const saved=savePreference(ctx,draft.remember.trim());return saveArtifact(ctx,{id:randomUUID(),text:`Saved to your personal memory:\n\n${saved.text}`,citations:[],createdAt:now(),kind,level:ctx.level,question,trace:['Saved an employee-owned preference for future briefings.']});}
 if(kind==='chat'&&draft.intent==='personal_memory'){const list=preferences(ctx);return saveArtifact(ctx,{id:randomUUID(),text:list.length?`Your remembered preferences:\n\n${list.map(p=>p.text).join('\n\n')}`:'Your personal memory has no saved preferences yet.',citations:[],createdAt:now(),kind,level:ctx.level,question,trace:['Read preferences owned by the selected employee.']});}
 requireCurrent(ctx);
 const {result,citations}=await verifyDraft(draft,question,permitted,ctx);
 if(kind==='chat'&&result.remember?.trim()) savePreference(ctx,result.remember.trim());
 const answer:Answer={id:randomUUID(),text:result.text,citations,createdAt:now(),kind,level:ctx.level,question,trace:[`Read ${permitted.length} permitted source records at L${ctx.level}.`,...(Array.isArray(result.trace)?result.trace.slice(0,5):[]),`Verified ${citations.length} quoted passages against runtime sources.`]};
 return saveArtifact(ctx,answer);
}
export async function generateBrief(ctx:Context,meetingId?:string) {
 const upcoming=accessibleMeetings(ctx);
 const meeting=upcoming.find(m=>m.id===meetingId);
 const task=meeting?`Prepare me for this simulated meeting: ${JSON.stringify(meeting)}. Show relevant commitments, changes, questions to ask and evidence-backed recommendations. Mark calendar data as simulated.`:`Prepare my morning brief for Monday 6 July 2026, considering all subsequent delivered demo messages as new updates. Prioritise relevant changes, unresolved commitments at their last recorded follow-up, decisions needed, and preparation for these simulated meetings: ${JSON.stringify(upcoming)}. Use clear short section labels and 4–6 useful items. Include source dates and precise evidence. Avoid repeating sensitive personal details when describing a correction or removal follow-up.`;
 return answerQuestion(ctx,task,meeting?'meeting':'brief');
}
export async function extractMemory(ctx:Context) {
 const permitted=memory.sources(ctx);
 const documents=[...new Set(permitted.map(s=>s.documentId))];
 const groups=Array.from({length:Math.ceil(documents.length/15)},(_,i)=>documents.slice(i*15,i*15+15));
 const permittedById=new Map(permitted.map(s=>[s.id,s]));
 const batches=await Promise.all(groups.map(async focus=>{
  const result=await modelJSON<{claims:{kind:string;text:string;status:string;sourceIds:string[]}[]}>(evidenceRules,`Extract up to 25 useful project-memory entries focused on these documents: ${JSON.stringify(focus)}. Read the full permitted archive below for related approvals, contradictions and later corrections. Cover decisions, commitments, open questions, corrections, workstreams and supported stakeholder observations. Keep each text under 35 words, each sourceIds list at most 3 IDs and total JSON under 16,000 characters. Preserve proposal/agreement attribution, scope and date. Every entry must have a supporting source in the focus documents, and may also cite related later evidence. status must distinguish agreed, proposed, outstanding, superseded, corrected or observation. Return {"claims":[{"kind":"decision|commitment|question|correction|workstream","text":"specific dated attributed observation","status":"agreed","sourceIds":["id"]}]}.\n${evidenceText(permitted)}`,()=>requireCurrent(ctx),ctx.workspaceId,false,0);
  const draftClaims=(result.claims||[]).map(c=>({...c,sourceIds:(c.sourceIds||[]).map(id=>resolveReference(id,permitted))})).filter(c=>c.text&&c.sourceIds?.length&&c.sourceIds.every(id=>permittedById.has(id))&&c.sourceIds.some(id=>focus.includes(permittedById.get(id)!.documentId)));
  const ids=new Set(draftClaims.flatMap(c=>c.sourceIds));
  const support=permitted.filter(source=>ids.has(source.id));
  const checked=await modelJSON<{claims:typeof draftClaims}>(evidenceRules,`Verify each proposed memory claim against its cited source passages. Remove unsupported claims or revise them to the exact scope supported. Keep agreement, evidence validity and temporal change clear. Return only {"claims":[{"kind":"decision","text":"verified specific observation","status":"agreed","sourceIds":["supporting ID"]}]}. Every claim requires source IDs. Do not add facts from general knowledge. Proposed entries: ${JSON.stringify(draftClaims)}\nSupporting passages:\n${evidenceText(support)}`,()=>requireCurrent(ctx),ctx.workspaceId,true,0);
  return (checked.claims||[]).map(c=>({...c,sourceIds:(c.sourceIds||[]).map(id=>resolveReference(id,permitted))})).filter(c=>c.text&&c.sourceIds?.length&&c.sourceIds.every(id=>ids.has(id))).map(c=>({...c,id:randomUUID(),level:ctx.level} as Claim));
 }));
 const list=batches.flat();
 if(!list.length)throw new Error('No source-backed memory entries were returned.');
 memory.replaceClaims(ctx,list);
 return list.length;
}
export function queueJob(ctx:Context,kind:string,payload:Record<string,unknown>={}) {
 if(kind==='mail')kind=`mail:${payload.mailId}`;else if(kind==='brief'||kind==='extract')kind=`${kind}:L${ctx.level}`;
 const d=db();
 const existing=d.prepare("SELECT id FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=? AND status IN ('queued','running')").get(ctx.workspaceId,ctx.persona.id,kind);
 if(existing){if(kind.startsWith('brief:')||kind.startsWith('extract:'))d.prepare("UPDATE wf_jobs SET payload=json_set(payload,'$.rerun',1) WHERE id=? AND status='running'").run(String(existing.id));return String(existing.id);}
 // Completed jobs remain separately auditable; no same-state uniqueness collision.
 d.prepare("DELETE FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=? AND status IN ('done','failed')").run(ctx.workspaceId,ctx.persona.id,kind);
 const id=randomUUID();
 d.prepare('INSERT INTO wf_jobs VALUES(?,?,?,?,?,?,?,?)').run(id,ctx.workspaceId,ctx.persona.id,kind,'queued',JSON.stringify({level:ctx.level,epoch:ctx.epoch,...payload}),null,now());
 schedulePump(); return id;
}
let pumpScheduled=false;
function schedulePump(){if(process.env.DISABLE_BACKGROUND==='1')return;if(!pumpScheduled){pumpScheduled=true;setTimeout(()=>{pumpScheduled=false;void runJobs();},50).unref();}}
const activeJobs=new Set<string>();
let backgroundActive=false;
let mailActive=false;
export async function runJobs(){
 const queued=db().prepare("SELECT * FROM wf_jobs WHERE status='queued' ORDER BY CASE WHEN kind LIKE 'mail:%' THEN 0 WHEN kind LIKE 'brief%' THEN 1 ELSE 2 END,created_at").all();
 for(const row of queued){
  const id=String(row.id);const isMail=String(row.kind).startsWith('mail:');
  if(activeJobs.has(id)||(isMail?mailActive:backgroundActive))continue;
  activeJobs.add(id);if(isMail)mailActive=true;else backgroundActive=true;
  db().prepare("UPDATE wf_jobs SET status='running' WHERE id=?").run(id);
  void (async()=>{
   const payload=JSON.parse(String(row.payload));
   try{
    const ctx=memory.context(String(row.workspace_id),String(row.owner),payload.level);
    if(ctx.epoch!==payload.epoch)throw new Error('Memory changed; refresh this task.');
    if(String(row.kind).startsWith('brief'))await generateBrief(ctx);
    else if(String(row.kind).startsWith('extract'))await extractMemory(ctx);
    else if(isMail)await processMail(ctx,String(payload.mailId));
    const current=db().prepare('SELECT payload FROM wf_jobs WHERE id=?').get(id);
    if(current&&JSON.parse(String(current.payload)).rerun)db().prepare("UPDATE wf_jobs SET status='queued',payload=json_remove(payload,'$.rerun') WHERE id=?").run(id);
    else db().prepare("UPDATE wf_jobs SET status='done',error=NULL WHERE id=?").run(id);
   }catch(error){db().prepare("UPDATE wf_jobs SET status='failed',error=? WHERE id=?").run(error instanceof Error?error.message:'Task failed',id);}
   finally{activeJobs.delete(id);if(isMail)mailActive=false;else backgroundActive=false;schedulePump();}
  })();
 }
}
function allMails(ctx:Context):Mail[]{
 const seeded=memory.sources(ctx).filter(s=>s.email&&s.type!=='simulated_email').map(s=>({id:s.id,threadId:s.documentId,subject:s.title,from:s.email!.from,to:s.email!.to,cc:s.email!.cc,body:s.text,date:s.date,status:'Historical archive',level:s.level} as Mail));
 const added=db().prepare('SELECT payload FROM wf_mail WHERE workspace_id=?').all(ctx.workspaceId).map(r=>JSON.parse(String(r.payload)) as Mail);
 return [...seeded,...added].filter(m=>m.level<=ctx.level&&[m.from,...m.to,...m.cc].some(email=>email.toLowerCase()===ctx.persona.email.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
}
function mailAudience(ctx:Context,to:string[],cc:string[]):Level{
 const recipients=[...to,...cc].filter(x=>x!==AGENT_EMAIL);
 if(!recipients.length){if([...to,...cc].includes(AGENT_EMAIL))return Math.min(ctx.level,2) as Level;throw new Error('Add a recipient.');}
 if(recipients.some(x=>!x.endsWith('@relexsolutions.example')))return 1;
 return Math.min(ctx.level,2,...recipients.map(x=>memory.personas.find(p=>p.email===x)?.level??1)) as Level;
}
export function sendMail(ctx:Context,input:{id?:string;threadId?:string;subject:string;to:string[];cc:string[];body:string}){
 if(memory.isSuppressed(ctx.workspaceId,JSON.stringify(input)))throw new Error('This message contains erased personal information.');
 if(!input.subject.trim()||!input.body.trim())throw new Error('Add a subject and message.');
 if(input.body.length>20000)throw new Error('Keep the message under 20,000 characters.');
 for(const address of [...input.to,...input.cc])if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw new Error(`Invalid recipient address: ${address}`);
 requireCurrent(ctx);
 const id=input.id||randomUUID();
 const existing=db().prepare('SELECT owner,payload FROM wf_mail WHERE workspace_id=? AND id=?').get(ctx.workspaceId,id);
 if(existing&&existing.owner!==ctx.persona.id)throw new Error('This delivery event belongs to another employee.');
 if(existing){const prior=JSON.parse(String(existing.payload)) as Mail;if(prior.level>ctx.level)throw new Error('This delivery event is outside the current access level.');return prior;}
 const level=mailAudience(ctx,input.to,input.cc);
 const delivered=[...input.to,...input.cc].includes(AGENT_EMAIL);
 const mail:Mail={id,threadId:input.threadId||`demo/${randomUUID()}`,subject:input.subject,from:ctx.persona.email,to:input.to,cc:input.cc,body:input.body,date:'2026-07-06T09:15:00+03:00',status:delivered?'Queued for project memory':'Sent in simulator',level};
 db().prepare('INSERT INTO wf_mail VALUES(?,?,?,?)').run(id,ctx.workspaceId,ctx.persona.id,JSON.stringify(mail));
 if(delivered)queueJob(ctx,'mail',{mailId:id});
 return mail;
}
function writeMail(ctx:Context,mail:Mail){db().prepare('UPDATE wf_mail SET payload=? WHERE workspace_id=? AND id=?').run(JSON.stringify(mail),ctx.workspaceId,mail.id);}
export async function processMail(original:Context,id:string){
 const row=db().prepare('SELECT payload FROM wf_mail WHERE workspace_id=? AND id=?').get(original.workspaceId,id);if(!row)return;
 const mail=JSON.parse(String(row.payload)) as Mail;
 if(mail.status==='Memory updated' || mail.status==='Agent replied')return;
 const level=mailAudience(original,mail.to,mail.cc);
 const ctx=memory.context(original.workspaceId,original.persona.id,level);
 if(mail.from===AGENT_EMAIL)return;
 const source:Source={id:`runtime/${mail.id}`,documentId:mail.threadId,title:mail.subject,type:'simulated_email',date:mail.date,author:original.persona.name,text:mail.body,level,position:'Delivered message',participants:[mail.from,...mail.to,...mail.cc],email:{from:mail.from,to:mail.to,cc:mail.cc}};
 memory.addSource(ctx,source);
 try {
  const permitted=memory.sources(ctx);
  const result=await modelJSON<ModelAnswer>(evidenceRules,`You are a visible email participant. Follow the conversation using permitted project memory. Respond when addressed directly. Participate proactively when your contribution brings substantial value, resolves an important uncertainty or prevents a consequential misunderstanding. Respect participants' attention. Stay silent when unnecessary, including routine scheduling and acknowledgements. A new message has been delivered; decide independently whether to reply. Private employee memory is unavailable.\nNew message: ${JSON.stringify(mail)}\nReturn {"participate":true or false,"text":"reply with [1] citations if participating, else empty","citations":[{"sourceId":"id","quote":"exact quote"}],"trace":["brief participation reason"],"meeting":null or {"title":"scheduled event title","date":"ISO date with timezone only when specified","attendees":["named attendees"],"purpose":"what to prepare"}}. Extract a meeting only when this new message explicitly schedules one, preserving its time and stated responsibilities. The event is a simulated calendar update derived from this message.\n${evidenceText(permitted)}`,()=>requireCurrent(ctx),ctx.workspaceId,false,3);
  let citations=bindCitations(result.citations,permitted);
  if(result.participate&&result.text){const verified=await verifyDraft(result,mail.body,permitted,ctx);result.text=verified.result.text;result.trace=verified.result.trace;citations=verified.citations;}
  if(memory.epoch(ctx.workspaceId)!==ctx.epoch)throw new Error('Memory changed during email processing.');
  if(result.participate&&result.text){
   if(!citations.length)throw new Error('Agent reply citation verification failed. Retry processing.');
   const answer=saveArtifact(ctx,{id:randomUUID(),text:result.text,citations,createdAt:now(),kind:'email',level,trace:result.trace||[]});
   const reply:Mail={id:`reply-${id}`,threadId:mail.threadId,subject:`Re: ${mail.subject.replace(/^Re: /i,'')}`,from:AGENT_EMAIL,to:[mail.from,...mail.to.filter(x=>x!==AGENT_EMAIL)],cc:mail.cc.filter(x=>x!==AGENT_EMAIL),body:result.text,date:'2026-07-06T09:16:00+03:00',status:'Agent reply',answer,level};
   db().prepare('INSERT OR IGNORE INTO wf_mail VALUES(?,?,?,?)').run(reply.id,ctx.workspaceId,original.persona.id,JSON.stringify(reply));mail.status='Agent replied';
  }else mail.status='Memory updated';
  if(result.meeting?.title&&result.meeting.date&&Number.isFinite(Date.parse(result.meeting.date))){const meeting={...result.meeting,id:`meeting-${mail.id}`,sourceIds:[source.id]};db().prepare('INSERT OR REPLACE INTO wf_meetings VALUES(?,?,?,?)').run(meeting.id,ctx.workspaceId,ctx.level,JSON.stringify(meeting));}
  mail.error=undefined;writeMail(ctx,mail);
  for(const person of memory.personas.filter(p=>p.projects.includes('acme'))){const target=memory.context(original.workspaceId,person.id);queueJob(target,'brief');queueJob(target,'extract');}
 }catch(error){mail.status='Processing failed';mail.error=error instanceof Error?error.message:'Processing failed';writeMail(ctx,mail);throw error;}
}
export function retryMail(ctx:Context,id:string){const mail=allMails(ctx).find(m=>m.id===id);if(!mail||mail.from!==ctx.persona.email)throw new Error('Message unavailable.');return queueJob(ctx,'mail',{mailId:id});}
export function promote(ctx:Context,text:string,level:Level){
 if(level>ctx.level||![1,2,3].includes(level))throw new Error('Choose an available access level.');
 if(!text.trim()||text.length>8000)throw new Error('Enter a note of up to 8,000 characters.');
 memory.addSource(ctx,{id:`note/${randomUUID()}`,documentId:`notes/${ctx.persona.id}`,title:'Shared note',type:'shared_note',date:now(),author:ctx.persona.name,text,level,position:'Employee-promoted note',participants:[ctx.persona.name]});
 queueJob(ctx,'extract');queueJob(ctx,'brief');
}
export function erase(ctx:Context,personId:string){db();return memory.erasePerson(ctx,personId);}
export function reset(ctx:Context){return memory.resetWorkspace(ctx.workspaceId);}
export function workspaceData(ctx:Context):WorkspaceData{
 db();
 const sourceList=memory.sources(ctx),claimList=memory.claims(ctx);
 const brief=artifacts(ctx,'brief')[0]||null;
 const personList=memory.people(ctx);
 const linkedIds=new Set([...claimList.flatMap(c=>c.sourceIds),...personList.flatMap(p=>p.sourceIds.slice(0,3))]);
 const previews=sourceList.filter((source,index)=>index<80||linkedIds.has(source.id)).map(source=>({...source,text:source.text.slice(0,320),participants:[],email:undefined}));
 const pending=db().prepare('SELECT id,kind,status,error,created_at FROM wf_jobs WHERE workspace_id=? AND owner=? ORDER BY created_at DESC').all(ctx.workspaceId,ctx.persona.id);
 return {context:ctx,personas:memory.visiblePersonas(ctx),sources:previews,claims:claimList,people:personList.map(p=>({...p,sourceIds:p.sourceIds.slice(0,20)})),brief,chat:artifacts(ctx,'chat').reverse(),preferences:preferences(ctx),mails:allMails(ctx),meetings:accessibleMeetings(ctx),jobs:pending.map(r=>({id:String(r.id),kind:String(r.kind).split(':')[0],status:String(r.status),error:r.error?String(r.error):undefined,createdAt:String(r.created_at)} as Job)),receipts:memory.erasedReceipts(ctx),stats:{documents:new Set(sourceList.map(s=>s.documentId)).size,sources:sourceList.length,claims:claimList.length},archiveDate};
}
export function prepareWorkspace(ctx:Context){
 db();
 seedPrepared(ctx);
 if(!artifacts(ctx,'brief').length&&!db().prepare("SELECT id FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=?").get(ctx.workspaceId,ctx.persona.id,`brief:L${ctx.level}`))queueJob(ctx,'brief');
 if(!memory.claims(ctx).some(c=>c.level===ctx.level)&&!db().prepare("SELECT id FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=?").get(ctx.workspaceId,ctx.persona.id,`extract:L${ctx.level}`))queueJob(ctx,'extract');
 schedulePump();
}

function seedPrepared(ctx:Context){
 if(ctx.workspaceId==='prepared-baseline'||ctx.epoch!==0||artifacts(ctx,'brief').length||preferences(ctx).length)return;
 const baseline=db().prepare("SELECT payload FROM wf_artifacts WHERE workspace_id='prepared-baseline' AND owner=? AND level=? AND kind='brief' ORDER BY rowid DESC LIMIT 1").get(ctx.persona.id,ctx.level);
 if(baseline){const answer=JSON.parse(String(baseline.payload)) as Answer;saveArtifact(ctx,{...answer,id:randomUUID()});}
 const stored=db().prepare("SELECT payload FROM memory_claims WHERE workspace_id='prepared-baseline' AND level=?").all(ctx.level);
 if(stored.length&&!memory.claims(ctx).length)memory.replaceClaims(ctx,stored.map(r=>({...JSON.parse(String(r.payload)),id:randomUUID()})));
}
async function scheduledRefresh(){
 const clock=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(new Date());
 if(Number(clock.slice(-2))<6)return;
 const users=db().prepare("SELECT DISTINCT workspace_id,owner FROM wf_artifacts WHERE kind='brief'").all();
 for(const user of users){try{
  const ctx=memory.context(String(user.workspace_id),String(user.owner));const brief=artifacts(ctx,'brief')[0];
  const day=(date:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki'}).format(new Date(date));
  if(!brief||day(brief.createdAt)!==day(now()))queueJob(ctx,'brief');
 }catch{/* A removed workspace has no scheduled work. */}}
 schedulePump();
}

function accessibleMeetings(ctx:Context):Meeting[]{
 if(!ctx.persona.projects.includes(ctx.projectId))return [];
 const stored=db().prepare('SELECT payload FROM wf_meetings WHERE workspace_id=? AND level<=?').all(ctx.workspaceId,ctx.level).map(r=>JSON.parse(String(r.payload)) as Meeting);
 return [...meetings,...stored].filter(m=>!memory.isSuppressed(ctx.workspaceId,JSON.stringify(m)));
}
