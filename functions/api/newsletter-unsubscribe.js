import {cfg,db,hash,html} from "../_shared.js";
export async function onRequest({request,env}){
 if(!["GET","POST"].includes(request.method))return html("Metodo non consentito.",405);
 const c=cfg(env),t=new URL(request.url).searchParams.get("token")||"";
 if(!/^[a-f0-9]{64}$/.test(t))return html("Link di disiscrizione non valido.",400);
 if(request.method==="GET")return html('<!doctype html><html lang="it"><meta charset="utf-8"><title>Disiscrizione</title><body style="font-family:Arial;text-align:center;padding:40px"><h1>Conferma la disiscrizione</h1><p>Premi il pulsante per interrompere la newsletter.</p><form method="POST" action="'+c.site+'/api/newsletter-unsubscribe?token='+t+'"><button>Conferma disiscrizione</button></form></body></html>');
 try{
  const h=await hash(t),tokens=await db(env,"newsletter_unsubscribe_tokens?token_hash=eq."+h+"&used_at=is.null&select=id,subscriber_id");
  if(tokens.length){
   const id=tokens[0].subscriber_id,changed=await db(env,"newsletter_subscribers?id=eq."+encodeURIComponent(id)+"&status=eq.confirmed",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"unsubscribed",unsubscribed_at:new Date().toISOString(),unsubscribe_token_hash:null})});
   await db(env,"newsletter_unsubscribe_tokens?subscriber_id=eq."+encodeURIComponent(id)+"&used_at=is.null",{method:"PATCH",body:JSON.stringify({used_at:new Date().toISOString()})});
   return html(changed.length?"Disiscrizione completata.":"Disiscrizione già completata.");
  }
  const legacy=await db(env,"newsletter_subscribers?unsubscribe_token_hash=eq."+h+"&status=eq.confirmed",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"unsubscribed",unsubscribed_at:new Date().toISOString(),unsubscribe_token_hash:null})});
  if(!legacy.length)return html("Link non valido o già utilizzato.",400);
  return html("Disiscrizione completata.");
 }catch(e){console.error("newsletter-unsubscribe",e.message);return html("Errore durante la disiscrizione.",500)}
}