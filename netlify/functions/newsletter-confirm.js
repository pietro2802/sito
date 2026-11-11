exports.handler=async(event)=>{
 const token=String(event.queryStringParameters?.token||'').trim();
 const url=process.env.SUPABASE_URL, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!token||!url||!service)return page('Link non valido o servizio non configurato.');
 try{
  const r=await fetch(url+'/rest/v1/newsletter_subscribers?confirmation_token=eq.'+encodeURIComponent(token),{headers:{apikey:service,Authorization:'Bearer '+service}});
  const rows=await r.json(); if(!rows?.length)return page('Link di conferma non valido o già utilizzato.');
  await fetch(url+'/rest/v1/newsletter_subscribers?id=eq.'+rows[0].id,{method:'PATCH',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({confirmed_at:new Date().toISOString(),confirmation_token:null})});
  return page('Iscrizione confermata. Riceverai il riepilogo settimanale quando verrà inviato.');
 }catch(e){return page('Non è stato possibile confermare l’iscrizione.')}
};
function page(message){return{statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'},body:`<!doctype html><html lang="it"><meta charset="utf-8"><title>NEWSGAMING2 Newsletter</title><body style="font-family:system-ui;background:#090d14;color:#eef5ff;display:grid;place-items:center;min-height:100vh"><main style="max-width:560px;padding:28px;border:1px solid #26364b;border-radius:16px;background:#111a28"><h1>NEWSGAMING2</h1><p>${message}</p><a href="/" style="color:#63e6f4">Torna al sito</a></main></body></html>`}}
