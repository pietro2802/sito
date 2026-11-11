const crypto=require('crypto');
exports.config={schedule:'0 9 * * 1'};
exports.handler=async()=>{
 const url=process.env.SUPABASE_URL, service=process.env.SUPABASE_SERVICE_ROLE_KEY, resend=process.env.RESEND_API_KEY, from=process.env.NEWSLETTER_FROM_EMAIL;
 if(!url||!service||!resend||!from)return {statusCode:503,body:'Newsletter non configurata'};
 const since=new Date(Date.now()-7*24*60*60*1000).toISOString();
 const ar=await fetch(url+'/rest/v1/articles?status=eq.published&published_at=gte.'+encodeURIComponent(since)+'&select=title,excerpt,slug&order=published_at.desc',{headers:{apikey:service,Authorization:'Bearer '+service}});
 const articles=await ar.json(); const list=(articles||[]).map(a=>`<li><a href="${process.env.URL||'https://newsgaming2.it'}/articolo.html?slug=${encodeURIComponent(a.slug)}">${escapeHtml(a.title)}</a>${a.excerpt?`<br><small>${escapeHtml(a.excerpt)}</small>`:''}</li>`).join('');
 const sr=await fetch(url+'/rest/v1/newsletter_subscribers?confirmed_at=not.is.null&unsubscribed_at=is.null&select=email,id',{headers:{apikey:service,Authorization:'Bearer '+service}});
 const subs=await sr.json();
 for(const s of (subs||[])){
   const unsub=(process.env.URL||'https://newsgaming2.it')+'/.netlify/functions/newsletter-unsubscribe?token='+encodeURIComponent(await tokenFor(s.id,url,service));
   await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json'},body:JSON.stringify({from,to:[s.email],subject:'NEWSGAMING2 · riepilogo settimanale',html:`<h1>NEWSGAMING2</h1><p>Le principali pubblicazioni degli ultimi 7 giorni.</p><ul>${list||'<li>Nessuna nuova pubblicazione.</li>'}</ul><p><a href="${unsub}">Disiscriviti</a></p>`})});
 }
 return {statusCode:200,body:JSON.stringify({sent:subs?.length||0,articles:articles?.length||0})};
};
async function tokenFor(id,url,service){
 const t=cryptoRandom(); await fetch(url+'/rest/v1/newsletter_subscribers?id=eq.'+id,{method:'PATCH',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({unsubscribe_token:t})});return t;
}
function cryptoRandom(){return crypto.randomBytes(32).toString('hex')}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
