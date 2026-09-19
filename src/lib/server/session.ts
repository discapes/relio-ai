import { randomUUID } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { context, personas } from './memory';
import type { Level } from '../types';
export function sessionContext(cookies:Cookies){
 let id=cookies.get('relex_workspace');
 if(!id||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)){id=randomUUID();cookies.set('relex_workspace',id,{path:'/',httpOnly:true,sameSite:'lax',secure:false,maxAge:60*60*24*30});}
 const persona=cookies.get('relex_persona')||'ana';
 const raw=cookies.get('relex_level');
 const selected=personas.find(p=>p.id===persona);
 if(!selected)return context(id,'other',1);
 const requested=raw?Number(raw):selected.level;
 const level=([1,2,3].includes(requested)?Math.min(requested,selected.level):1) as Level;
 return context(id,selected.id,level);
}
