import {cfg,db,hash,token,html} from "../_shared.js";
export async function onRequest({request,env}){
 if(!["GET","POST"].includes(request.method))return html("Metodo non consentito.",405);
 const c=cfg(env),t=new URL(request.url).searchParams.get("token")||"";
 if(!/^[a-f0-9]{64}$/.test(t))return html("Link di conferma non valido.",400);
 if(request.method==="GET")return html('<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Conferma iscrizione</title><body style="font-family:Arial;text-align:center;padding:40px"><h1>Conferma iscrizione</h1><p>Premi il pulsante per attivare la newsletter.</p><form method="POST" action="'+c.site+'/api/newsletter-confirm?token='+t+'"><button>Conferma iscrizione</button></form></body></html>');
 try{
  const h=await hash(t),rows=await db(env,"newsletter_subscribers?confirmation_token_hash=eq."+h+"&status=eq.pending&select=email");
  if(!rows.length)return html("Link non valido o già utilizzato.",400);
  const ut=token(),uh=await hash(ut),updated=await db(env,"newsletter_subscribers?confirmation_token_hash=eq."+h+"&status=eq.pending",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"confirmed",confirmed_at:new Date().toISOString(),confirmation_token_hash:null,unsubscribe_token_hash:uh,unsubscribed_at:null})});
  if(!updated.length)return html("Richiesta già elaborata.",409);
  if(c.resend&&c.from){const link=c.site+"/api/newsletter-unsubscribe?token="+ut;const m=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+c.resend,"Content-Type":"application/json"},body:JSON.stringify({from:c.from,to:[rows[0].email],subject:"Iscrizione confermata - NEWSGAMING2",html:'<h2>Iscrizione confermata</h2><p>Grazie per esserti iscritto.</p><p><a href="'+link+'">Disiscriviti</a></p>'})});if(!m.ok)console.error("Welcome email failed",m.status)}
  return html('<!doctype html><html lang="it"><meta charset="utf-8"><title>Confermata</title><body style="font-family:Arial;text-align:center;padding:40px"><h1>Iscrizione confermata!</h1><a href="'+c.site+'">Torna al sito</a></body></html>');
 }catch(e){console.error("newsletter-confirm",e.message);return html("Errore durante la conferma. Riprova più tardi.",500)}
}