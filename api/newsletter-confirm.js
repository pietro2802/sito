import crypto from "node:crypto";

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const siteUrl = (process.env.SITE_URL || "https://www.newsgaming2.it").replace(/\/$/, "");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function confirmationPage(token) {
  return `<!doctype html>
  <html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conferma iscrizione</title></head>
  <body style="background:#07111f;color:#fff;font-family:Arial;text-align:center;padding:50px 20px">
    <h1 style="color:#00d9ff">Conferma la tua iscrizione</h1>
    <p>Per attivare la newsletter di NEWSGAMING2, conferma la richiesta qui sotto.</p>
    <form method="POST" action="${siteUrl}/api/newsletter-confirm?token=${encodeURIComponent(token)}">
      <button type="submit" style="padding:13px 22px;border:0;border-radius:8px;background:#00d9ff;color:#07111f;font-weight:bold;cursor:pointer">Conferma iscrizione</button>
    </form>
    <p><a href="${siteUrl}" style="color:#00d9ff">Torna a NEWSGAMING2</a></p>
  </body></html>`;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Metodo non consentito.");
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const token = String(req.query?.token || body.token || "");
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).send("Link di conferma non valido.");
  }

  // Il link GET non conferma l'iscrizione: mostra un pulsante esplicito.
  if (req.method === "GET") {
    return res.status(200).send(confirmationPage(token));
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).send("Configurazione non disponibile.");
    }

    const tokenHash = hashToken(token);
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const searchUrl =
      `${supabaseUrl}/rest/v1/newsletter_subscribers` +
      `?confirmation_token_hash=eq.${tokenHash}` +
      `&status=eq.pending&select=email`;
    const lookup = await fetch(searchUrl, { headers });

    if (!lookup.ok) throw new Error("Errore nella verifica del token.");
    const subscribers = await lookup.json();
    if (!subscribers.length) {
      return res.status(400).send(`
        <!doctype html><html lang="it"><head><meta charset="utf-8"><title>Link non valido</title></head>
        <body style="font-family:Arial;text-align:center;padding:40px">
          <h2>Link non valido o già utilizzato</h2><p><a href="${siteUrl}">Torna a NEWSGAMING2</a></p>
        </body></html>
      `);
    }

    const email = subscribers[0].email;
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeHash = hashToken(unsubscribeToken);

    const updateUrl =
      `${supabaseUrl}/rest/v1/newsletter_subscribers` +
      `?confirmation_token_hash=eq.${tokenHash}&status=eq.pending`;
    const update = await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmation_token_hash: null,
        unsubscribe_token_hash: unsubscribeHash,
        unsubscribed_at: null
      })
    });

    if (!update.ok) throw new Error("Errore durante la conferma.");
    const updated = await update.json();
    if (!updated.length) {
      return res.status(409).send("Questa richiesta è già stata elaborata. Aggiorna la pagina o torna alla homepage.");
    }

    if (resendKey && fromEmail) {
      const unsubscribeUrl = `${siteUrl}/api/newsletter-unsubscribe?token=${unsubscribeToken}`;
      const mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: "Iscrizione confermata - NEWSGAMING2",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
              <h2>Iscrizione confermata!</h2>
              <p>Grazie per esserti iscritto alla newsletter di NEWSGAMING2.</p>
              <p>Riceverai le comunicazioni previste dalla newsletter.</p>
              <p><a href="${unsubscribeUrl}">Gestisci la disiscrizione</a></p>
              <p>NEWSGAMING2</p>
            </div>
          `
        })
      });
      if (!mail.ok) console.error("Errore invio email di benvenuto.");
    }

    return res.status(200).send(`
      <!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Iscrizione confermata</title></head>
      <body style="background:#07111f;color:#fff;font-family:Arial;text-align:center;padding:50px 20px">
        <h1 style="color:#00d9ff">Iscrizione confermata!</h1>
        <p>Grazie! La tua iscrizione alla newsletter NEWSGAMING2 è attiva.</p>
        <a href="${siteUrl}" style="color:#00d9ff">Torna alla homepage</a>
      </body></html>
    `);
  } catch (error) {
    console.error("Newsletter confirmation error:", error.message);
    return res.status(500).send("Si è verificato un errore. Riprova più tardi.");
  }
}
