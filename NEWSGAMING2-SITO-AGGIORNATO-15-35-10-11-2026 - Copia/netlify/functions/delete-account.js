exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({error:'Metodo non consentito'}) };
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !anon || !service) return { statusCode: 503, headers, body: JSON.stringify({error:'Servizio non configurato. Contatta il gestore del sito.'}) };
  try {
    const userRes = await fetch(url + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + token } });
    if (!userRes.ok) return { statusCode: 401, headers, body: JSON.stringify({error:'Sessione non valida. Accedi di nuovo.'}) };
    const user = await userRes.json();
    const delRes = await fetch(url + '/auth/v1/admin/users/' + encodeURIComponent(user.id), {
      method: 'DELETE', headers: { apikey: service, Authorization: 'Bearer ' + service }
    });
    if (!delRes.ok) return { statusCode: 502, headers, body: JSON.stringify({error:'Supabase non ha confermato la cancellazione.'}) };
    return { statusCode: 200, headers, body: JSON.stringify({ok:true}) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({error:'Errore temporaneo del servizio.'}) };
  }
};
