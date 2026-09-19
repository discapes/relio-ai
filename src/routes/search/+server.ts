import { json } from '@sveltejs/kit';
import { sessionContext } from '$lib/server/session';
import { sources } from '$lib/server/memory';
export function GET({cookies,url}){
 const ctx=sessionContext(cookies);const query=(url.searchParams.get('q')||'').trim().slice(0,500).toLowerCase();
 const matching=sources(ctx).filter(source=>`${source.title} ${source.author} ${source.text}`.toLowerCase().includes(query));
 const offset=Math.max(0,Number(url.searchParams.get('offset')||0));
 return json({total:matching.length,sources:matching.slice(offset,offset+120).map(source=>{const index=source.text.toLowerCase().indexOf(query);const start=Math.max(0,index-80);return {...source,text:source.text.slice(start,start+420),participants:[],email:undefined};})},{headers:{'cache-control':'private, no-store'}});
}
