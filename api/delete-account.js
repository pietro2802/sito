import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token di autorizzazione mancante.' });
    }

    const token = authHeader.split(' ')[1];

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NG_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Configurazione server incompleta.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Utente non autenticato o token non valido.' });
    }

    const userId = user.id;

    // Eliminazione del profilo utente
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Eliminazione utente da Supabase Auth (richiede service_role)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true, message: 'Account eliminato con successo.' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Errore interno del server.' });
  }
}
