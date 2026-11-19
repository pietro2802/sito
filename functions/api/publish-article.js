const REPO="pietro2802/sito",BRANCH="main",SITE="https://newsgaming2.it",MAX_BODY=8*1024*1024;
const TAGS=new Set(["a","p","br","h2","h3","h4","strong","b","em","i","u","ul","ol","li","blockquote","figure","figcaption","img","hr","code","pre","table","thead","tbody","tr","th","td"]);
const DROP=new Set(["script","style","iframe","object","embed","svg","math","form","input","button","textarea","select","option","video","audio","source","link","meta","base"]);
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slugify=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);
function safeUrl(value,image=false){if(!String(value||"").trim())return "";try{if(image&&!/^https:\/\//i.test(value)&&!String(value).startsWith("/"))return "";const u=new URL(value,SITE);if(!["https:","http:"].includes(u.protocol)||u.username||u.password)return "";if(image&&u.protocol!=="https:")return "";if(!image&&u.protocol==="http:"&&u.origin!==SITE)return "";return u.href;}catch{return "";}}
function textHtml(s){return String(s).split(/\r?\n\s*\r?\n/).map(b=>{b=b.trim();if(!b)return "";if(/^##\s+/.test(b))return "<h2>"+esc(b.replace(/^##\s+/,""))+"</h2>";if(/^###\s+/.test(b))return "<h3>"+esc(b.replace(/^###\s+/,""))+"</h3>";return "<p>"+esc(b).replace(/\r?\n/g,"<br>")+"</p>";}).join("\n");}
async function sanitize(s){
 const html="<!doctype html><html><body>"+s+"</body></html>";
 const out=await new HTMLRewriter().on("*",{element(el){
  const tag=el.tagName.toLowerCase();if(DROP.has(tag)){el.remove();return;}if(!TAGS.has(tag)){el.removeAndKeepContent();return;}
  for(const name of el.getAttributeNames()){
   const n=name.toLowerCase(),v=el.getAttribute(name)||"";
   if(n==="href"&&tag==="a"){const u=safeUrl(v);if(u)el.setAttribute("href",u);else el.removeAttribute(name);}
   else if(n==="src"&&tag==="img"){const u=safeUrl(v,true);if(u)el.setAttribute("src",u);else el.removeAttribute(name);}
   else if(n==="alt"&&tag==="img")el.setAttribute("alt",v.slice(0,300));
   else if(n==="title"&&(tag==="img"||tag==="a"))el.setAttribute("title",v.slice(0,200));
   else if(n==="target"&&tag==="a"&&v==="_blank")el.setAttribute("rel","noopener noreferrer");
   else el.removeAttribute(name);
  }
  if(tag==="a"&&el.getAttribute("target")==="_blank")el.setAttribute("rel","noopener noreferrer");
  if(tag==="img"){el.setAttribute("loading","lazy");el.setAttribute("decoding","async");}
 }}).on("body",{comments(c){c.remove();}}).transform(new Response(html)).text();
 const m=out.match(/<body[^>]*>([\s\S]*?)<\/body>/i);return m?m[1].trim():"";
}
const dateText=d=>new Date(d+"T12:00:00Z").toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
function makeArticle(p){
 const url=SITE+"/articoli/"+p.slug+".html",t=esc(p.title),d=esc(p.description),im=esc(p.imageUrl),alt=esc(p.imageAlt);
 const ld=JSON.stringify({"@context":"https://schema.org","@type":"Article","headline":p.title,"description":p.description,"image":[p.imageUrl],"datePublished":p.date,"dateModified":p.date,"author":{"@type":"Organization","name":"NEWSGAMING2"},"publisher":{"@type":"Organization","name":"NEWSGAMING2","url":SITE},"mainEntityOfPage":{"@type":"WebPage","@id":url}}).replace(/</g,"\\u003c");
 return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23090d14'/%3E%3Ctext x='50' y='67' font-size='54' text-anchor='middle' fill='%2363e6f4' font-family='Arial' font-weight='bold'%3ENG%3C/text%3E%3C/svg%3E" rel="icon">
<title>${t} | NEWSGAMING2</title><meta name="description" content="${d}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
<meta property="og:title" content="${t}"><meta property="og:description" content="${d}"><meta property="og:type" content="article"><meta property="og:url" content="${url}"><meta property="og:image" content="${im}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${t}"><meta name="twitter:description" content="${d}"><meta name="twitter:image" content="${im}">
<link rel="stylesheet" href="/assets/neon-futuristico.css"><link rel="stylesheet" href="/assets/ng-community.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4436901367597680" crossorigin="anonymous"><\/script>
<script type="application/ld+json">${ld}<\/script>
<style>body{margin:0;background:#090d14;color:#eef5ff;font:16px/1.8 system-ui}.wrap{width:min(980px,calc(100% - 32px));margin:auto}.article-head{padding:30px 0}.dek,.meta,figcaption{color:#a9b7c9}.article-hero-image img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:16px}.article-body{padding:12px 0 38px}.article-body h2{margin-top:32px}.article-body p{color:#d8e2ef}.related-track{display:flex;gap:14px;overflow:auto}.related-card{min-width:220px;padding:16px;background:#111a28;border:1px solid #26364b;border-radius:12px}</style></head><body>
<div class="topline"><header class="wrap nav"><a class="brand ng-brand" href="/index.html" aria-label="Home NEWSGAMING2"><span class="ng-brand-mark">N<span>G</span></span><span class="ng-brand-word">NEWS<span>GAMING2</span></span></a><nav class="navlinks"><a href="/index.html">Home</a><a href="/articoli.html">Articoli</a><a href="/scopri.html">Scopri</a><a href="/giochi.html">Giochi</a><a href="/community.html">Community</a><a href="/account.html">Account</a></nav></header></div>
<main class="wrap"><header class="article-head"><h1>${t}</h1><p class="dek">${d}</p><p class="meta">${dateText(p.date)} · Redazione NEWSGAMING2 · ${esc(p.category)} · ${esc(p.platforms.join(" · "))}</p></header>
<figure class="article-hero-image"><img src="${im}" alt="${alt}" loading="eager"><figcaption>${alt}</figcaption></figure><article class="article-body">${p.content}</article>
<section id="ngArticleSocial" class="ng-panel"></section><script type="module" src="/assets/article-social.js"><\/script>
<section id="ngArticleComments" class="ng-panel"><h2>Commenti della community</h2><p id="ngArticleCommentsLogin" class="muted"></p><form id="ngArticleCommentForm" class="ng-form"><label>Scrivi un commento<textarea id="ngArticleCommentBody" maxlength="3000" required placeholder="Il tuo contributo"></textarea></label><button class="ng-btn" type="submit">Pubblica</button></form><p id="ngArticleCommentMsg" class="muted" aria-live="polite"></p><div id="ngArticleCommentsList"></div></section>
<script src="/assets/supabase-config.js"><\/script><script type="module" src="/assets/article-comments.js"><\/script>
<section class="related-feed"><h2>Altri articoli</h2><div class="related-track"><a class="related-card" href="/articoli/gta-6-sfida-pacifista-cosa-e-confermato.html">Ultimi approfondimenti NEWSGAMING2</a><a class="related-card" href="/articoli/gta-6-approfondimento-completo-leonida.html">Scopri altri articoli</a></div></section></main>
<footer class="ng-footer"><div class="wrap"><div class="ng-footer-top"><div><strong class="ng-footer-brand">NEWS<span>GAMING2</span></strong><p>Il tuo hub per notizie, guide e cultura videoludica.</p></div><a class="ng-back-top" href="/index.html#top" aria-label="Torna in alto">↑ TORNA SU</a></div><div class="footlinks"><a href="/index.html">Home</a><a href="/articoli.html">Articoli</a><a href="/scopri.html">Scopri articoli</a><a href="/giochi.html">Giochi</a><a href="/community.html">Community</a><a href="/privacy.html">Privacy</a><a href="/cookie-policy.html">Cookie Policy</a><a href="/termini.html">Termini di servizio</a><a href="/chi-siamo.html">Chi siamo</a><a href="/contatti.html">Contatti</a><a href="#" id="ngConsentSettings" hidden>Impostazioni privacy e cookie</a><script>window.googlefc=window.googlefc||{};window.googlefc.callbackQueue=window.googlefc.callbackQueue||[];window.googlefc.callbackQueue.push({"CONSENT_API_READY":function(){const link=document.getElementById("ngConsentSettings");if(link)link.hidden=false;}});document.getElementById("ngConsentSettings")?.addEventListener("click",function(e){e.preventDefault();window.googlefc=window.googlefc||{};window.googlefc.callbackQueue=window.googlefc.callbackQueue||[];window.googlefc.callbackQueue.push(function(){if(typeof window.googlefc.showRevocationMessage==="function")window.googlefc.showRevocationMessage();});});<\/script></div><p>Progetto editoriale indipendente. I marchi citati appartengono ai rispettivi titolari. NEWSGAMING2 non è affiliato ai produttori menzionati.</p><p>© ${p.date.slice(0,4)} NEWSGAMING2</p></div>
<div class="ng-social-links" aria-label="Seguici sui social"><a class="ng-social-link ng-social-ig" href="https://www.instagram.com/news_gaming2/" target="_blank" rel="noopener noreferrer" aria-label="NEWSGAMING2 su Instagram" title="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg><span>Instagram</span></a>
<a class="ng-social-link ng-social-fb" href="https://www.facebook.com/share/1CbHgufSGb/" target="_blank" rel="noopener noreferrer" aria-label="NEWSGAMING2 su Facebook" title="Facebook"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99C18.34 20.99 22 16.99 22 12z"/></svg><span>Facebook</span></a>
<a class="ng-social-link ng-social-tt" href="https://www.tiktok.com/@ytita__" target="_blank" rel="noopener noreferrer" aria-label="NEWSGAMING2 su TikTok" title="TikTok"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3z"/></svg><span>TikTok</span></a></div></footer></body></html>`;
}
async function gh(path,token,options={}){
 const res=await fetch("https://api.github.com"+path,{...options,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(options.headers||{})}});
 const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error("GitHub API "+res.status+": "+(body.message||"errore"));return body;
}
async function blob(path,content,token,encoding="utf-8"){return gh("/repos/"+REPO+"/git/blobs",token,{method:"POST",body:JSON.stringify({content,encoding})});}
export async function onRequest({request,env}){
 try{
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":SITE,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type","Vary":"Origin"}});
  if(request.method!=="POST")return reply({error:"Metodo non consentito."},405);
  const origin=request.headers.get("Origin");if(origin&&origin!==SITE)return reply({error:"Origine non autorizzata."},403);
  const sb=String(env.SUPABASE_URL||"").replace(/\/$/,""),service=env.SUPABASE_SERVICE_ROLE_KEY,token=env.GITHUB_PUBLISH_TOKEN;
  if(!sb||!service||!token)return reply({error:"Configurazione server incompleta."},500);
  const auth=(request.headers.get("Authorization")||"").match(/^Bearer\s+([A-Za-z0-9._-]+)$/i);if(!auth)return reply({error:"Autenticazione richiesta."},401);
  const userRes=await fetch(sb+"/auth/v1/user",{headers:{"apikey":service,"Authorization":"Bearer "+auth[1]}});
  if(!userRes.ok)return reply({error:"Sessione Supabase non valida."},401);
  const user=await userRes.json();if(!user?.id)return reply({error:"Utente non autenticato."},401);
  const roleRes=await fetch(sb+"/rest/v1/user_roles?select=role&user_id=eq."+encodeURIComponent(user.id),{headers:{"apikey":service,"Authorization":"Bearer "+service}});
  if(!roleRes.ok)return reply({error:"Verifica del ruolo non disponibile."},503);
  const role=(await roleRes.json())?.[0]?.role;if(!["admin","editor"].includes(role))return reply({error:"Permessi insufficienti: richiesto ruolo admin o editor."},403);
  const raw=await request.arrayBuffer();if(raw.byteLength>MAX_BODY)return reply({error:"Richiesta troppo grande."},413);
  let p;try{p=JSON.parse(new TextDecoder().decode(raw));}catch{return reply({error:"JSON non valido."},400);}
  const title=String(p.title||"").trim().slice(0,180),description=String(p.description||"").trim().slice(0,500),slug=slugify(p.slug);
  if(!title||!description||!slug||slug!==String(p.slug||"").trim().toLowerCase())return reply({error:"Titolo, descrizione e slug valido sono obbligatori."},400);
  const category=String(p.category||"News e approfondimenti").trim().slice(0,80),platforms=Array.isArray(p.platforms)?p.platforms.map(x=>String(x).trim().slice(0,60)).filter(Boolean).slice(0,12):[],date=new Date().toISOString().slice(0,10);
  let imageUrl="",imagePath="",imageBase64=String(p.imageDataBase64||"");
  if(imageBase64){
   if(imageBase64.length>6*1024*1024||!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64))return reply({error:"Immagine base64 non valida o troppo grande."},400);
   let bytes;try{bytes=Uint8Array.from(atob(imageBase64),c=>c.charCodeAt(0));}catch{return reply({error:"Base64 immagine non valido."},400);}
   if(bytes.length<12||String.fromCharCode(...bytes.slice(0,4))!=="RIFF"||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")return reply({error:"L'immagine caricata deve essere WebP."},400);
   imagePath="immagini/articoli/"+slug+".webp";imageUrl="/"+imagePath;
  }else{imageUrl=safeUrl(String(p.imageUrl||""),true);if(!imageUrl)return reply({error:"Inserisci un URL HTTPS valido o carica un WebP."},400);}
  let content=String(p.content||"").trim();if(!content||content.length>2_000_000)return reply({error:"Testo articolo vuoto o troppo lungo."},400);
  if(!/<[a-z][\s\S]*>/i.test(content))content=textHtml(content);
  content=await sanitize(content);if(!content)return reply({error:"Contenuto senza elementi HTML consentiti."},400);
  const ref=await gh("/repos/"+REPO+"/git/ref/heads/"+BRANCH,token),parent=ref.object.sha,commit=await gh("/repos/"+REPO+"/git/commits/"+parent,token),treeSha=commit.tree.sha;
  const tree=await gh("/repos/"+REPO+"/git/trees/"+treeSha+"?recursive=1",token);if(tree.truncated)return reply({error:"Albero repository troppo grande."},503);
  const entries=tree.tree||[],exists=new Set(entries.map(x=>x.path)),articlePath="articoli/"+slug+".html";
  if(exists.has(articlePath)||(imagePath&&exists.has(imagePath)))return reply({error:"Slug già utilizzato. Scegline un altro."},409);
  const je=entries.find(x=>x.path==="data/articoli.json"&&x.type==="blob"),se=entries.find(x=>x.path==="sitemap.xml"&&x.type==="blob");
  if(!je||!se)return reply({error:"Archivio JSON o sitemap non trovati."},500);
  const [jb,sbBlob]=await Promise.all([gh("/repos/"+REPO+"/git/blobs/"+je.sha,token),gh("/repos/"+REPO+"/git/blobs/"+se.sha,token)]);
  const decode=b=>new TextDecoder().decode(Uint8Array.from(atob(b.content.replace(/\n/g,"")),c=>c.charCodeAt(0)));
  let archive,sitemap;try{archive=JSON.parse(decode(jb));sitemap=decode(sbBlob);}catch{return reply({error:"Archivio o sitemap non leggibili."},500);}
  if(!Array.isArray(archive.articles)||!sitemap.includes("<urlset"))return reply({error:"Formato archivio o sitemap non valido."},500);
  const imageAlt=String(p.imageFilename||title).replace(/\.[^.]+$/,"").replace(/[-_]+/g," ").slice(0,250);
  const page=makeArticle({title,description,slug,category,platforms,imageUrl,imageAlt,content,date}),record={id:title.toLocaleLowerCase("it"),title,category,date,url:articlePath,image:imageUrl,imageAlt,description};
  archive.articles=archive.articles.filter(x=>x.url!==articlePath);archive.articles.unshift(record);archive.updatedAt=date;archive.version=archive.version||1;
  sitemap=sitemap.replace("</urlset>",'  <url><loc>'+esc(SITE+"/"+articlePath)+'</loc><lastmod>'+date+'</lastmod></url>\n</urlset>');
  const items=[],pageBlob=await blob(articlePath,page,token);items.push({path:articlePath,mode:"100644",type:"blob",sha:pageBlob.sha});
  if(imageBase64){const ib=await blob(imagePath,imageBase64,token,"base64");items.push({path:imagePath,mode:"100644",type:"blob",sha:ib.sha});}
  const [newJson,newMap]=await Promise.all([blob("data/articoli.json",JSON.stringify(archive,null,2)+"\n",token),blob("sitemap.xml",sitemap,token)]);
  items.push({path:"data/articoli.json",mode:"100644",type:"blob",sha:newJson.sha},{path:"sitemap.xml",mode:"100644",type:"blob",sha:newMap.sha});
  const nextTree=await gh("/repos/"+REPO+"/git/trees",token,{method:"POST",body:JSON.stringify({base_tree:treeSha,tree:items})});
  const message=p.sendNewsletter===true?"Pubblica articolo: "+slug:"[skip actions] Pubblica articolo: "+slug;
  const nextCommit=await gh("/repos/"+REPO+"/git/commits",token,{method:"POST",body:JSON.stringify({message,tree:nextTree.sha,parents:[parent]})});
  await gh("/repos/"+REPO+"/git/refs/heads/"+BRANCH,token,{method:"PATCH",body:JSON.stringify({sha:nextCommit.sha,force:false})});
  const url=SITE+"/"+articlePath;return reply({ok:true,url,commitUrl:"https://github.com/"+REPO+"/commit/"+nextCommit.sha,commit:nextCommit.sha,newsletterRequested:p.sendNewsletter===true},201);
 }catch(error){return reply({error:error?.message||"Errore interno di pubblicazione."},500);}
}