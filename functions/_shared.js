export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
export function html(body,status=200){return new Response(body,{status,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
export function cfg(env){return {url:(env.SUPABASE_URL||"").replace(/\/$/,""),key:env.SUPABASE_SERVICE_ROLE_KEY||"",resend:env.RESEND_API_KEY||"",from:env.RESEND_FROM_EMAIL||"",publish:env.NEWSLETTER_PUBLISH_TOKEN||"",site:(env.SITE_URL||"https://newsgaming2.it").replace(/\/$/,"")}}
export async function body(request){try{return await request.json()}catch{return {}}}
export async function hash(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}
export function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,"0")).join("")}
export function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
export function equal(a,b){a=String(a||"");b=String(b||"");if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
export async function db(env,path,opts={}){const c=cfg(env);if(!c.url||!c.key)throw Error("Configurazione Supabase mancante");const r=await fetch(c.url+"/rest/v1/"+path,{...opts,headers:{apikey:c.key,Authorization:"Bearer "+c.key,"Content-Type":"application/json",...(opts.headers||{})}});const t=await r.text();if(!r.ok)throw Error("Supabase "+r.status+": "+t.slice(0,300));return t?JSON.parse(t):[]}
