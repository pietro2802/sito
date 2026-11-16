import {cfg,db,hash,token,json,body,esc,equal} from "../_shared.js";
export async function onRequest({request,env}){
 if(request.method!=="POST")return json({error:"Metodo non consentito."},405);
 const c=cfg(env);if(!c.url||!c.key||!c.resend||!c.from||!c.publish)return json({error:"Configurazione newsletter incompleta."},500);
 if(!equal(request.headers.get("x-publish-token"),c.publish))return json({error:"Non autorizzato."},401);
 const v=await body(request),title=String(v.title||"").trim().slice(0,180),description=String(v.description||"").trim().slice(0,400),slug=String(v.slug||"").trim();
 let article;try{article=new URL(String(v.url||""))}catch{}
 if(!title||!/^[a-z0-9][a-z0-9-]{1,140}$/.test(slug)||!article||article.protocol!=="https:"||!["newsgaming2.it","www.newsgaming2.it"].includes(article.hostname)||!article.pathname.startsWith("/articoli/"))return json({error:"Dati articolo non validi."},400);
 try{
  const made=await db(env,"newsletter_article_notifications?on_conflict=slug",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=representation"},body:JSON.stringify([{slug,title,article_url:article.toString(),status:"processing"}])});
  if(!made.length){const old=await db(env,"newsletter_article_notifications?slug=eq."+encodeURIComponent(slug)+"&select=status");if(old[0]?.status==="sent")return json({message:"Articolo già notificato.",duplicate:true});if(old[0]?.status==="processing")return json({error:"Notifica già in elaborazione."},409);await db(env,"newsletter_article_notifications?slug=eq."+encodeURIComponent(slug),{method:"PATCH",body:JSON.stringify({status:"processing",title,article_url:article.toString(),delivered_count:0})})}
  let delivered=0;
  try{
   for(let offset=0;;offset+=500){
    const subs=await db(env,"newsletter_subscribers?status=eq.confirmed&select=id,email&order=id.asc&limit=500&offset="+offset);
    for(let start=0;start<subs.length;start+=100){
     const batch=subs.slice(start,start+100),prepared=[];
     for(const s of batch){const t=token();prepared.push({email:s.email,id:s.id,url:c.site+"/api/newsletter-unsubscribe?token="+t,hash:await hash(t)})}
     await db(env,"newsletter_unsubscribe_tokens",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(prepared.map(x=>({subscriber_id:x.id,token_hash:x.hash})))});
     const messages=prepared.map(x=>({from:c.from,to:[x.email],subject:"Nuovo articolo su NEWSGAMING2: "+title,html:"<div><h2>"+esc(title)+"</h2>"+(description?"<p>"+esc(description)+"</p>":"")+'<p><a href="'+article.toString()+'">Leggi l’articolo</a></p><p><a href="'+x.url+'">Disiscriviti</a></p></div>',headers:{"List-Unsubscribe":"<"+x.url+">","List-Unsubscribe-Post":"List-Unsubscribe=One-Click"}}));
     const mail=await fetch("https://api.resend.com/emails/batch",{method:"POST",headers:{Authorization:"Bearer "+c.resend,"Content-Type":"application/json","Idempotency-Key":"ng-newsletter-"+slug+"-"+Math.floor((offset+start)/100)},body:JSON.stringify(messages)});
     if(!mail.ok)throw Error("Resend "+mail.status);delivered+=batch.length;
    }
    if(subs.length<500)break;
   }
   await db(env,"newsletter_article_notifications?slug=eq."+encodeURIComponent(slug),{method:"PATCH",body:JSON.stringify({status:"sent",delivered_count:delivered,sent_at:new Date().toISOString()})});
   return json({message:"Notifica inviata.",delivered});
  }catch(e){await db(env,"newsletter_article_notifications?slug=eq."+encodeURIComponent(slug),{method:"PATCH",body:JSON.stringify({status:"failed",delivered_count:delivered})}).catch(()=>{});throw e}
 }catch(e){console.error("newsletter-publish",e.message);return json({error:"Invio newsletter non riuscito."},500)}
}