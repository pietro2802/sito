ISTRUZIONI PASSO PASSO PER NEWSGAMING2

---

1. SUPABASE (Funzione SQL):
- Vai su Supabase -> NEWSGAMING2 -> SQL Editor -> New Query.
- Incolla il codice di `supabase/migrations/20261111_claim_daily_login.sql`.
- Clicca su RUN.

2. GITHUB:
- Aggiorna `assets/profile.js` con il nuovo file.
- Crea la cartella `api` nella radice e crea il file `api/delete-account.js`.
- Fai il Commit delle modifiche su `main`.

3. VERCEL:
- Vai su Vercel -> NEWSGAMING2 -> Settings -> Environment Variables.
- Aggiungi:
  - SUPABASE_URL
  - SUPABASE_PUBLISHABLE_KEY
  - SUPABASE_SERVICE_ROLE_KEY (chiave segreta da Supabase)
- Fai Redeploy del progetto.
