import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
let session=null;
const esc=v=>(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function boot(){
 const {data}=await sb.auth.getSession();session=data.session;
 if(!session){location.replace('/account.html');return}
 const {data:role,error}=await sb.from('user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
 if(error||!role||!['admin','editor','moderator'].includes(role.role)){document.body.innerHTML='<main class="ng-page"><div class="ng-alert error">Accesso negato: questa area è riservata alla redazione.</div></main>';return}
 $('#role').textContent=role.role.toUpperCase();
 if(role.role==='moderator'){document.querySelector('#editorPanel')?.remove();document.querySelector('#gamePanel')?.remove();}
 await loadArticles(); await loadReports();
 $('#articleForm')?.addEventListener('submit',saveArticle);
 $('#refresh')?.addEventListener('click',()=>{loadArticles();loadReports()});
}
async function loadArticles(){
 const {data,error}=await sb.from('articles').select('id,title,slug,category,status,published_at,updated_at').order('updated_at',{ascending:false});
 if(error){$('#articles').innerHTML='<div class="ng-alert error">'+esc(error.message)+'</div>';return}
 $('#articles').innerHTML=(data||[]).map(a=>`<tr><td>${esc(a.title)}</td><td>${esc(a.category)}</td><td>${esc(a.status)}</td><td>${a.published_at?new Date(a.published_at).toLocaleString('it-IT'):'—'}</td><td><button class="ng-mini" data-edit="${a.id}">Modifica</button></td></tr>`).join('');
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editArticle(b.dataset.edit));
}
async function editArticle(id){
 const {data,error}=await sb.from('articles').select('*').eq('id',id).single();if(error)return alert(error.message);
 for(const [key,val] of Object.entries(data)){const el=$(`[name="${key}"]`);if(el)el.value=Array.isArray(val)?val.join(', '):val??''} $('#bodyEditor').value=data.body||'';
 $('#articleForm').dataset.id=id;window.scrollTo({top:0,behavior:'smooth'});
}
async function saveArticle(e){
 e.preventDefault();const f=e.currentTarget;
 const payload={title:f.title.value.trim(),slug:f.slug.value.trim(),excerpt:f.excerpt.value.trim(),body:f.body.value,category:f.category.value,platforms:f.platforms.value.split(',').map(x=>x.trim()).filter(Boolean),cover_url:f.cover_url.value.trim()||null,status:f.status.value,author_id:session.user.id,published_at:f.status.value==='published'?(f.published_at.value||new Date().toISOString()):null};
 if(!payload.title||!payload.slug||!payload.body){$('#articleMsg').textContent='Titolo, slug e testo sono obbligatori.';return}
 const id=f.dataset.id;
 const q=id?sb.from('articles').update(payload).eq('id',id):sb.from('articles').insert(payload);
 const {error}=await q;
 $('#articleMsg').textContent=error?'Errore: '+error.message:(id?'Articolo aggiornato.':'Articolo salvato.');
 if(!error){f.reset();delete f.dataset.id;await loadArticles();}
}
async function loadReports(){
 const {data,error}=await sb.from('reports').select('id,reason,details,status,created_at,comment_id').order('created_at',{ascending:false});
 if(error){$('#reports').innerHTML='<div class="ng-alert error">'+esc(error.message)+'</div>';return}
 $('#reports').innerHTML=(data||[]).map(r=>`<tr><td>${esc(r.reason)}</td><td>${esc(r.details||'')}</td><td>${esc(r.status)}</td><td>${new Date(r.created_at).toLocaleString('it-IT')}</td><td>${r.status==='open'?`<button class="ng-mini" data-close="${r.id}">Segna gestita</button>`:'—'}</td></tr>`).join('');
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=async()=>{await sb.from('reports').update({status:'reviewed',reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq('id',b.dataset.close);loadReports()});
}
boot();
