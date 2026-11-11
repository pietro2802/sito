NEWSGAMING2 — AGGIORNAMENTO COMMUNITY / GAMES / REDAZIONE

Questo pacchetto mantiene gli articoli e le pagine statiche esistenti e aggiunge un secondo livello dinamico collegato a Supabase.

AGGIUNTO
- Community: commenti, reazioni, segnalazioni e discussioni per articolo.
- Profili: nome visualizzato, username, bio, XP, livelli, badge, preferiti e notifiche.
- Database giochi: schede con piattaforme, generi, date, copertine e fonti ufficiali.
- Redazione protetta: articoli dinamici, bozze, pubblicazione/archiviazione e gestione segnalazioni.
- Newsletter: consenso non preselezionato, doppio opt-in, disiscrizione e funzione settimanale.
- Sicurezza: RLS Supabase, ruoli separati, controllo server-side per cancellazione account e funzioni newsletter.
- Nessun sistema VIP o abbonamento a pagamento.

PRIMA DEL DEPLOY

1. Supabase
   - Apri SQL Editor.
   - Esegui `supabase-schema.sql`.
   - Controlla che tutte le tabelle abbiano RLS attivo.
   - Configura Authentication > URL Configuration con il dominio reale.
   - Email provider: usa SMTP affidabile per registrazione/reset.

2. Primo amministratore
   - Registra il tuo account normalmente.
   - Dopo che il profilo è stato creato, in Supabase SQL Editor esegui:
     update public.user_roles set role='admin' where user_id='IL_TUO_USER_ID';
   - Non inserire la Service Role Key nel frontend.

3. Netlify environment variables
   - SUPABASE_URL = URL del progetto
   - SUPABASE_PUBLISHABLE_KEY = publishable key pubblica
   - SUPABASE_SERVICE_ROLE_KEY = SOLO lato server Netlify
   - RESEND_API_KEY = chiave del provider email, SOLO lato server
   - NEWSLETTER_FROM_EMAIL = indirizzo mittente verificato dal provider
   - URL = dominio pubblico del sito, se diverso da quello rilevato automaticamente

4. Newsletter
   La funzione richiede un provider email (qui è predisposta l'integrazione Resend).
   Il form non iscrive automaticamente: l'utente deve confermare il link ricevuto.
   L'invio settimanale è predisposto come Scheduled Function Netlify.
   Se non configuri RESEND_API_KEY e NEWSLETTER_FROM_EMAIL, la newsletter resta disattivata senza rompere il sito.

5. Redazione
   - /redazione.html è accessibile solo a utenti con ruolo admin/editor/moderator.
   - admin/editor possono gestire gli articoli dinamici.
   - moderator gestisce le segnalazioni.
   - Le pagine HTML statiche già presenti non vengono convertite o cancellate.

LIMITI E TEST

Non è corretto dichiarare che il collegamento live a Supabase, SMTP, Resend o Netlify sia già testato: questo archivio può essere verificato localmente, ma il test reale richiede il deploy e l'esecuzione delle variabili/SQL nel progetto.

Le date, i prezzi, i cataloghi e le informazioni dei videogiochi non vengono inventati dal codice. La sezione /giochi.html mostra solo i record inseriti dalla redazione nel database.

SICUREZZA
- La publishable key nel browser è prevista da Supabase e non sostituisce RLS.
- La Service Role Key non è presente nell'archivio.
- Le funzioni Netlify verificano il token della sessione prima delle operazioni amministrative sensibili.
- Le policy RLS impediscono a un utente normale di scrivere contenuti editoriali o gestire ruoli.
