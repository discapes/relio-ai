import { context, personas } from '../src/lib/server/memory.ts';
import { generateBrief, extractMemory } from '../src/lib/server/workflows.ts';
for(const persona of personas.filter(p=>p.projects.includes('acme'))){
 const ctx=context('prepared-baseline',persona.id);const start=Date.now();
 await extractMemory(ctx);await generateBrief(ctx);
 console.log(`${persona.id}: prepared in ${((Date.now()-start)/1000).toFixed(1)}s`);
}
