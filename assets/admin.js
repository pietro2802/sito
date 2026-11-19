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
 if(['admin','editor'].includes(role.role)) initStaticPublisher();
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

function makeStaticSlug(value){return value.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);}
function initStaticPublisher(){
 const panel=$('#staticPublishPanel'),form=$('#staticPublishForm');if(!panel||!form)return;panel.hidden=false;
 const title=form.elements.staticTitle,slug=form.elements.staticSlug,preview=$('#staticSlugPreview');
 title.addEventListener('input',()=>{if(!slug.dataset.edited)slug.value=makeStaticSlug(title.value);updatePreview();});
 slug.addEventListener('input',()=>{slug.value=makeStaticSlug(slug.value);slug.dataset.edited='1';updatePreview();});
 function updatePreview(){preview.textContent='https://newsgaming2.it/articoli/'+(slug.value||'...')+'.html';}
 form.addEventListener('submit',publishStaticArticle);
}
async function compressCover(file){
 if(!file)return null;if(!file.type.startsWith('image/'))throw new Error('Seleziona un file immagine valido.');
 if(file.size>15*1024*1024)throw new Error('L’immagine originale supera 15 MB.');
 const bitmap=await createImageBitmap(file),scale=Math.min(1,1280/bitmap.width),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('Compressione WebP non riuscita.')),'image/webp',0.82));
 if(blob.size>4*1024*1024)throw new Error('Immagine compressa troppo grande (massimo 4 MB).');
 const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(',')[1]);fr.onerror=()=>reject(new Error('Lettura immagine non riuscita.'));fr.readAsDataURL(blob);});
 return {imageDataBase64:data,imageFilename:(file.name.replace(/\\.[^.]+$/,'')||'copertina')+'.webp'};
}
async function publishStaticArticle(e){
 e.preventDefault();const form=e.currentTarget,button=$('#staticPublishButton'),msg=$('#staticPublishMsg'),val=n=>form.elements[n].value.trim();
 const title=val('staticTitle'),description=val('staticDescription'),slug=makeStaticSlug(val('staticSlug')),content=val('staticContent');
 if(!title||!description||!slug||!content){msg.textContent='Compila titolo, descrizione, slug e testo.';return;}
 if(!session?.access_token){msg.textContent='Sessione scaduta: accedi di nuovo.';return;}
 button.disabled=true;button.textContent='Pubblicazione in corso…';msg.textContent='Preparazione e pubblicazione…';
 try{
  const file=$('#staticImageFile').files[0],image=await compressCover(file),imageUrl=val('staticImageUrl');
  if(image&&imageUrl)throw new Error('Scegli un file oppure un URL immagine, non entrambi.');
  if(!image&&!imageUrl)throw new Error('Carica un’immagine o inserisci un URL HTTPS.');
  const payload={title,description,slug,category:val('staticCategory'),platforms:val('staticPlatforms').split(',').map(x=>x.trim()).filter(Boolean),content,sendNewsletter:form.elements.staticSendNewsletter.checked,...(image||{}),...(imageUrl?{imageUrl}:{})};
  const res=await fetch('/api/publish-article',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify(payload)});
  const data=await res.json().catch(()=>({error:'Risposta server non valida.'}));if(!res.ok)throw new Error(data.error||'Pubblicazione non riuscita ('+res.status+').');
  msg.innerHTML='Articolo pubblicato: <a href="'+esc(data.url)+'" target="_blank" rel="noopener noreferrer">Apri articolo</a> · <a href="'+esc(data.commitUrl)+'" target="_blank" rel="noopener noreferrer">Commit GitHub</a>';
  form.reset();delete form.elements.staticSlug.dataset.edited;$('#staticSlugPreview').textContent='https://newsgaming2.it/articoli/';
 }catch(err){msg.textContent='Errore: '+err.message;}
 finally{button.disabled=false;button.textContent='Pubblica ora su NEWSGAMING2';}
}

boot();
