const crypto=require('crypto');
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Metodo non consentito'});
 try{
  const {email,website}=JSON.parse(event.body||'{}'); if(String(website||'').trim())return json(400,{error:'Richiesta non valida.'}); const normalized=String(email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))return json(400,{error:'Indirizzo email non valido.'});
  const url=process.env.SUPABASE_URL, service=process.env.SUPABASE_SERVICE_ROLE_KEY, resend=process.env.RESEND_API_KEY, from=process.env.NEWSLETTER_FROM_EMAIL;
  if(!url||!service||!resend||!from)return json(503,{error:'Newsletter non configurata. Imposta le variabili Netlify richieste.'});
  const token=crypto.randomBytes(32).toString('hex');
  const r=await fetch(url+'/rest/v1/newsletter_subscribers?on_conflict=email',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email:normalized,confirmation_token:token,unsubscribed_at:null})});
  if(!r.ok)return json(502,{error:'Impossibile registrare l’iscrizione.'});
  const origin=process.env.URL||'https://newsgaming2.it';
  const confirm=origin+'/.netlify/functions/newsletter-confirm?token='+encodeURIComponent(token);
  const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json'},body:JSON.stringify({from,to:[normalized],subject:'Conferma iscrizione NEWSGAMING2',html:`<p>Conferma l’iscrizione alla newsletter NEWSGAMING2.</p><p><a href="${confirm}">Conferma iscrizione</a></p><p>Se non hai richiesto tu l'iscrizione, ignora questa email.</p>`})});
  if(!mail.ok)return json(502,{error:'Iscrizione registrata ma email di conferma non inviata. Riprova più tardi.'});
  return json(200,{ok:true,message:'Controlla la tua email per confermare l’iscrizione.'});
 }catch(e){return json(500,{error:'Errore temporaneo.'})}
};
function json(status,body){return{statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)}}
