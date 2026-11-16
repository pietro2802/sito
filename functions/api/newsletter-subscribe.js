import {cfg,db,hash,token,json,body} from "../_shared.js";
export async function onRequest({request,env}){
 if(request.method!=="POST")return json({error:"Metodo non consentito."},405);
 const c=cfg(env),v=await body(request);
 if(!c.url||!c.key||!c.resend||!c.from)return json({error:"Configurazione newsletter incompleta."},500);
 if(v.website)return json({message:"Se la richiesta è valida, riceverai un'email."});
 if(v.privacyNoticeAccepted!==true)return json({error:"Conferma la presa visione dell'Informativa sulla Privacy."},400);
 if(v.consent!==true)return json({error:"Devi scegliere separatamente di ricevere la newsletter."},400);
 const email=String(v.email||"").trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"Indirizzo email non valido."},400);
 try{
  const old=await db(env,"newsletter_subscribers?email=eq."+encodeURIComponent(email)+"&select=id,status");
  if(old[0]?.status==="confirmed")return json({message:"Questa email è già iscritta alla newsletter."});
  const t=token(),h=await hash(t),row={email,confirmation_token:null,confirmation_token_hash:h,unsubscribe_token:null,unsubscribe_token_hash:null,status:"pending",consent_at:new Date().toISOString(),confirmed_at:null,unsubscribed_at:null};
  const saved=old.length?await db(env,"newsletter_subscribers?email=eq."+encodeURIComponent(email),{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(row)}):await db(env,"newsletter_subscribers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)});
  if(!saved.length)return json({error:"Impossibile salvare l'iscrizione."},500);
  const link=c.site+"/api/newsletter-confirm?token="+t;
  const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+c.resend,"Content-Type":"application/json"},body:JSON.stringify({from:c.from,to:[email],subject:"Conferma la tua iscrizione - NEWSGAMING2",html:"<h2>Conferma la tua iscrizione</h2><p>Hai richiesto la newsletter di NEWSGAMING2.</p><p><a href=\""+link+"\">Conferma iscrizione</a></p><p>Se non hai richiesto tu l'iscrizione, ignora questa email.</p>"})});
  if(!mail.ok)return json({error:"Iscrizione registrata ma email di conferma non inviata. Riprova più tardi."},502);
  return json({message:"Controlla la tua email e clicca sul link per confermare l'iscrizione."});
 }catch(e){console.error("newsletter-subscribe",e.message);return json({error:"Si è verificato un errore. Riprova più tardi."},500)}
}