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
 if(['admin','editor'].includes(role.role)){initStaticPublisher();initStaticArticleManager();}
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

function makeStaticSlug(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);}
function initStaticPublisher(){
 const panel=$('#staticPublishPanel'),form=$('#staticPublishForm');if(!panel||!form)return;panel.hidden=false;
 const title=form.elements.staticTitle,slug=form.elements.staticSlug,preview=$('#staticSlugPreview');
 title.addEventListener('input',()=>{if(!slug.dataset.edited)slug.value=makeStaticSlug(title.value);updatePreview();});
 slug.addEventListener('input',()=>{slug.value=makeStaticSlug(slug.value);slug.dataset.edited='1';updatePreview();});
 function updatePreview(){preview.textContent='https://newsgaming2.it/articoli/'+(slug.value||'...')+'.html';}
 form.addEventListener('submit',e=>form.dataset.editSlug?updateStaticArticle(e):publishStaticArticle(e));
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
 return {imageDataBase64:data,imageFilename:(file.name.replace(/\.[^.]+$/,'')||'copertina')+'.webp'};
}
async function publishStaticArticle(e){
 e.preventDefault();const form=e.currentTarget,button=$('#staticPublishButton'),msg=$('#staticPublishMsg'),val=n=>form.elements[n].value.trim();
 const title=val('staticTitle'),description=val('staticDescription'),slug=makeStaticSlug(val('staticSlug')),content=sanitizeEditorHtml(val('staticContent'));
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


let staticArchive=[];
let staticPreviewMeta='Redazione NEWSGAMING2 · '+new Date().toLocaleDateString('it-IT');
function staticForm(){return $('#staticPublishForm');}
function staticVal(name){return staticForm()?.elements[name]?.value?.trim()||'';}
function setStaticMessage(message,isError=false){const node=$('#staticPublishMsg');if(node){node.textContent=message;node.style.color=isError?'#ff8d8d':'';}}
async function staticApi(action,payload={}){
 if(!session?.access_token)throw new Error('Sessione scaduta: accedi di nuovo.');
 const res=await fetch('/api/manage-article',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({action,...payload})});
 const data=await res.json().catch(()=>({error:'Risposta server non valida.'}));
 if(!res.ok)throw new Error(data.error||'Operazione non riuscita ('+res.status+').');
 return data;
}
function staticSlugFromUrl(value){
 let raw=String(value||'').trim();
 try{if(/^https?:\/\//i.test(raw))raw=new URL(raw).pathname;}catch{return '';}
 raw=raw.split(/[?#]/,1)[0].replace(/^\/+/, '');
 if(raw.startsWith('articoli/'))raw=raw.slice('articoli/'.length);
 if(raw.toLowerCase().endsWith('.html'))raw=raw.slice(0,-5);
 return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)&&raw.length<=120?raw:'';
}
async function loadStaticArchive(){
 const body=$('#staticArticlesList');if(!body)return;
 body.innerHTML='<p class="muted">Caricamento articoli…</p>';
 try{
  const res=await fetch('/data/articoli.json?t='+Date.now(),{cache:'no-store'});if(!res.ok)throw new Error('Archivio non disponibile.');
  const data=await res.json();staticArchive=Array.isArray(data.articles)?data.articles.filter(a=>a&&staticSlugFromUrl(a.url)): [];
  renderStaticArchive();
 }catch(error){body.textContent='Errore: '+error.message;}
}
function renderStaticArchive(){
 const body=$('#staticArticlesList'),query=($('#staticArticleSearch')?.value||'').trim().toLocaleLowerCase('it');
 if(!body)return;
 const rows=staticArchive.filter(a=>(String(a.title||'')+' '+String(a.url||'').replace(/^articoli\/|\.html$/g,'')).toLocaleLowerCase('it').includes(query));
 if(!rows.length){body.innerHTML='<p class="muted">Nessun articolo trovato.</p>';return;}
 body.innerHTML=rows.map(a=>{
  const slug=staticSlugFromUrl(a.url);
  return '<article class="static-article-row"><div class="static-article-info"><strong>'+esc(a.title||slug)+'</strong><small>'+esc(a.category||'')+' · '+esc(slug)+'</small></div><div class="static-article-actions"><a class="ng-mini" href="/'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">Apri</a><button class="ng-mini" type="button" data-static-edit="'+esc(slug)+'">Modifica</button><button class="ng-mini danger" type="button" data-static-delete="'+esc(slug)+'">Elimina</button></div></article>';
 }).join('');
 body.querySelectorAll('[data-static-edit]').forEach(b=>b.addEventListener('click',()=>editStaticArticle(b.dataset.staticEdit)));
 body.querySelectorAll('[data-static-delete]').forEach(b=>b.addEventListener('click',()=>deleteStaticArticle(b.dataset.staticDelete)));
}
function sanitizeEditorHtml(source){
 const doc=new DOMParser().parseFromString('<!doctype html><html><body><div id="ng-sanitizer-root">'+String(source??'')+'</div></body></html>','text/html');
 const root=doc.getElementById('ng-sanitizer-root');
 if(!root)return '';
 const allowed=new Set(['A','P','BR','H2','H3','H4','STRONG','B','EM','I','U','UL','OL','LI','BLOCKQUOTE','FIGURE','FIGCAPTION','IMG','HR','CODE','PRE','TABLE','THEAD','TBODY','TR','TH','TD']);
 const drop=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','TEXTAREA','SELECT','OPTION','VIDEO','AUDIO','SOURCE','LINK','META','BASE']);
 function clean(node){
  for(const child of Array.from(node.childNodes||[])){
   if(child.nodeType===3)continue;
   if(child.nodeType!==1)continue;
   const tag=String(child.tagName||'').toUpperCase();
   if(drop.has(tag)){child.remove();continue;}
   if(!allowed.has(tag)){clean(child);child.replaceWith(...Array.from(child.childNodes||[]));continue;}
   for(const attr of Array.from(child.attributes||[])){
    const name=String(attr.name||'').toLowerCase(),value=String(attr.value||'');
    if(tag==='A'&&name==='href'){
     try{const u=new URL(value,location.origin);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||(u.protocol==='http:'&&u.origin!==location.origin))child.removeAttribute(name);}
     catch{child.removeAttribute(name);}
    }else if(tag==='IMG'&&name==='src'){
     try{const u=new URL(value,location.origin);if((u.protocol!=='https:'&&u.origin!==location.origin)||u.username||u.password)child.removeAttribute(name);}
     catch{child.removeAttribute(name);}
    }else if((tag==='IMG'&&['alt','title'].includes(name))||(tag==='A'&&['title','target','rel'].includes(name))){
     if(name==='target'&&value!=='_blank')child.removeAttribute(name);
    }else child.removeAttribute(name);
   }
   if(tag==='A'&&child.getAttribute('target')==='_blank')child.setAttribute('rel','noopener noreferrer');
   clean(child);
  }
 }
 clean(root);
 return root.innerHTML;
}
function previewStaticArticle(){
 const form=staticForm();if(!form)return;
 const dialog=$('#staticPreviewDialog'),content=$('#staticPreviewContent');if(!dialog||!content)return;
 content.replaceChildren();
 const category=document.createElement('p');category.className='preview-category';category.textContent=staticVal('staticCategory')||'News e approfondimenti';
 const title=document.createElement('h1');title.textContent=staticVal('staticTitle')||'Titolo articolo';
 const description=document.createElement('p');description.className='preview-description';description.textContent=staticVal('staticDescription')||'Descrizione articolo';
 const meta=document.createElement('p');meta.className='preview-meta';meta.textContent=staticPreviewMeta;
 content.append(category,title,description,meta);
 const file=$('#staticImageFile')?.files?.[0],url=staticVal('staticImageUrl');
 if(file||url){const img=document.createElement('img');img.className='preview-cover';img.alt=staticVal('staticTitle')||'Copertina articolo';img.src=file?URL.createObjectURL(file):url;content.append(img);}
 const article=document.createElement('article');article.className='preview-body';article.innerHTML=sanitizeEditorHtml(staticVal('staticContent')||'<p>Il contenuto dell’articolo apparirà qui.</p>');content.append(article);
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}
async function editStaticArticle(slug){
 try{
  const data=await staticApi('load',{slug}),a=data.article,form=staticForm();
  if(!form)throw new Error('Modulo di pubblicazione non trovato.');
  form.elements.staticTitle.value=a.title||'';form.elements.staticDescription.value=a.description||'';form.elements.staticSlug.value=a.slug||slug;form.elements.staticSlug.dataset.edited='1';form.elements.staticSlug.readOnly=true;
  form.elements.staticCategory.value=a.category||'News e approfondimenti';form.elements.staticPlatforms.value=(a.platforms||[]).join(', ');
  form.elements.staticImageUrl.value=a.imageUrl||'';form.dataset.originalImageUrl=a.imageUrl||'';form.elements.staticContent.value=a.content||'';
  const articleDate=a.date?new Date(a.date+'T12:00:00').toLocaleDateString('it-IT'):'Data non disponibile';
  staticPreviewMeta=(a.author||'Redazione NEWSGAMING2')+' · '+articleDate;
  const editMeta=$('#staticEditMeta');if(editMeta){editMeta.textContent='Autore: '+(a.author||'Redazione NEWSGAMING2')+' · Data: '+articleDate;editMeta.hidden=false;}
  $('#staticImageFile').value='';form.dataset.editSlug=slug;
  form.elements.staticSendNewsletter.checked=false;
  $('#staticPublishHeading').textContent='Modifica articolo: '+slug;
  $('#staticPublishButton').textContent='Salva modifiche';
  $('#staticCancelEdit').hidden=false;
  $('#staticSlugPreview').textContent='https://newsgaming2.it/articoli/'+slug+'.html';
  setStaticMessage('Articolo caricato da GitHub. Le modifiche non saranno pubblicate finché non premi “Salva modifiche”.');
  form.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){setStaticMessage('Errore: '+error.message,true);}
}
async function updateStaticArticle(e){
 e.preventDefault();const form=e.currentTarget,button=$('#staticPublishButton'),slug=form.dataset.editSlug;
 const payload={slug,title:staticVal('staticTitle'),description:staticVal('staticDescription'),category:staticVal('staticCategory'),platforms:staticVal('staticPlatforms').split(',').map(x=>x.trim()).filter(Boolean),content:sanitizeEditorHtml(staticVal('staticContent')),imageUrl:staticVal('staticImageUrl')||form.dataset.originalImageUrl||'',imageAlt:staticVal('staticTitle'),sendNewsletter:form.elements.staticSendNewsletter.checked};
 try{
  button.disabled=true;button.textContent='Salvataggio…';
  const image=await compressCover($('#staticImageFile').files[0]);if(image)Object.assign(payload,image);
  const data=await staticApi('update',payload);
  setStaticMessage('Modifiche salvate. '+data.commitUrl);
  cancelStaticEdit(false);await loadStaticArchive();
 }catch(error){setStaticMessage('Errore: '+error.message,true);}
 finally{button.disabled=false;button.textContent=form.dataset.editSlug?'Salva modifiche':'Pubblica ora su NEWSGAMING2';}
}
function cancelStaticEdit(showMessage=true){
 const form=staticForm();if(!form)return;
 delete form.dataset.editSlug;delete form.dataset.originalImageUrl;form.reset();form.elements.staticSlug.readOnly=false;delete form.elements.staticSlug.dataset.edited;
 $('#staticPublishHeading').textContent='Pubblica nuovo articolo sul sito';$('#staticPublishButton').textContent='Pubblica ora su NEWSGAMING2';$('#staticCancelEdit').hidden=true;
 const editMeta=$('#staticEditMeta');if(editMeta){editMeta.hidden=true;editMeta.textContent='';}staticPreviewMeta='Redazione NEWSGAMING2 · '+new Date().toLocaleDateString('it-IT');
 $('#staticSlugPreview').textContent='https://newsgaming2.it/articoli/';
 if(showMessage)setStaticMessage('Modifica annullata. Nessuna modifica è stata pubblicata.');
}
async function deleteStaticArticle(slug){
 if(!confirm('Sei sicuro di voler eliminare definitivamente questo articolo?'))return;
 if(!confirm('Conferma finale: l’articolo e l’eventuale immagine non utilizzata saranno eliminati definitivamente. Continuare?'))return;
 try{const data=await staticApi('delete',{slug});if(staticForm()?.dataset.editSlug===slug)cancelStaticEdit(false);await loadStaticArchive();setStaticMessage('Articolo eliminato. '+data.commitUrl);}
 catch(error){setStaticMessage('Errore durante l’eliminazione: '+error.message,true);}
}
function initStaticArticleManager(){
 const panel=$('#staticArticlesPanel');if(!panel)return;
 panel.hidden=false;$('#staticArticleSearch')?.addEventListener('input',renderStaticArchive);
 $('#staticCancelEdit')?.addEventListener('click',()=>cancelStaticEdit());
 $('#staticPreviewButton')?.addEventListener('click',previewStaticArticle);
 $('#staticPreviewClose')?.addEventListener('click',()=>$('#staticPreviewDialog')?.close());
 loadStaticArchive();
}

boot();
