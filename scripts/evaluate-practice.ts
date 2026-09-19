import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { Answer } from '../src/lib/types';
const questions=[
 'What did the master-data assessment report as complete in September 2024? Give every figure and the document each comes from. Distinguish assessment findings from remediation completion.',
 'What service levels were agreed for ordering, and in which meeting? Explain any missing detail in the recorded agreement.',
 'Who proposed removing the operator ID field from the data extract, who agreed, and had it already been sent anywhere by then? Cover the chronology.',
 'Did Acme sign off UAT for the programme? Quote the scope of what was actually signed, and name who signed it.',
 'What proportion of articles had shelf-life data populated? Give every figure in the archive with its date and source, and say which one is current.',
 'Is bakery inside the fresh workstream? Show how the answer changed over time and what it is now.',
 'Using only the surviving runtime evidence after the erasure, what can still be established about the September 2024 master-data assessment and remediation figures? Distinguish September evidence from independent later reports. Do not reconstruct withdrawn evidence.',
 'Find one thing in the archive that was agreed and then never done. Show the trail from the agreement to the present, and say who would have needed to notice. Limit certainty to the archive.',
 'The weekly status reports say the nightly article extract completed with no errors. Is that true? Answer the question the reports are actually evidence for, and say what they are not evidence for.'
];

interface Result {question:number;durationMs:number;status:string;answer?:Answer;error?:string;erasure?:{sourcesRemoved:number;artifactsRemoved:number};workspaceId:string;generatedAt:string}
const directory='docs/practice_live';
mkdirSync(directory,{recursive:true});
const index=process.argv[2];
if(!index) {
 for(let i=1;i<=questions.length;i++) {
  await new Promise<void>((resolve,reject)=>{
   const child=spawn(process.execPath,[...process.execArgv,import.meta.filename,String(i)],{stdio:'inherit',env:process.env});
   child.once('error',reject);child.once('exit',()=>resolve());
  });
 }
 process.exit(0);
}
const number=Number(index);
if(!Number.isInteger(number)||number<1||number>9)throw new Error('Pass a practice-question number from 1 to 9.');
process.env.DATA_DIR=resolve('data/practice-evaluation');
const memory=await import('../src/lib/server/memory');
const workflow=await import('../src/lib/server/workflows');
const workspaceId=`practice_p${number}_${Date.now()}`;
let ctx=memory.context(workspaceId,'ana');
const result:Result={question:number,durationMs:0,status:'pending',workspaceId,generatedAt:new Date().toISOString()};
if(number===7){result.erasure=workflow.erase(ctx,'kwame-boateng');ctx=memory.context(workspaceId,'ana');}
const started=Date.now();console.log(`Starting P${number}`);
try {
 result.answer=await workflow.answerQuestion(ctx,questions[number-1],'evaluation');
 result.status='generated';
 console.log(`P${number}: ${result.answer.citations.length} citations, ${Date.now()-started} ms`);
}catch(error){result.status='failed';result.error=error instanceof Error?error.message:String(error);console.log(`P${number} failed: ${result.error}`);}
result.durationMs=Date.now()-started;
writeFileSync(`${directory}/p${number}.json`,JSON.stringify(result,null,2)+'\n');
const results:Result[]=[];
for(let i=1;i<=9;i++){const path=`${directory}/p${i}.json`;if(existsSync(path))results.push(JSON.parse(readFileSync(path,'utf8')));}
const output=['# Live practice answers','','Generated through the application answer workflow, using isolated runtime workspaces and glm-5.3-flash on the configured Helsinki endpoint. Each question records its date and source citations. P7 uses a fresh workspace erased before generation. Independent expected answers are in practice_reference.md.',''];
for(const r of results){
 output.push(`## P${r.question}`,'',questions[r.question-1],'',`Generated: ${r.generatedAt}. Duration: ${(r.durationMs/1000).toFixed(1)} seconds.`,'');
 if(r.erasure)output.push(`Erasure: ${r.erasure.sourcesRemoved} sources removed; ${r.erasure.artifactsRemoved} artifacts invalidated.`,'');
 if(r.answer){output.push(r.answer.text,'','Sources:','');r.answer.citations.forEach((c,j)=>output.push(`${j+1}. ${c.title}; ${c.date}; ${c.author}; ${c.position}. Record: \`${c.sourceId}\`. Quote: ${JSON.stringify(c.quote)}`));output.push('');}
 else output.push(`Generation failed: ${r.error}`,'');
}
writeFileSync('docs/PRACTICE_ANSWERS.md',output.join('\n'));
writeFileSync('docs/practice_evaluation.json',JSON.stringify({runAt:new Date().toISOString(),results:results.map(({answer,...r})=>({...r,citations:answer?.citations.length}))},null,2)+'\n');
process.exit(result.status==='failed'?1:0);
