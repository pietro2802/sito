import crypto from "node:crypto";

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;

const siteUrl = (
  process.env.SITE_URL || "https://www.newsgaming2.it"
).replace(/\/$/, "");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito."
    });
  }

  try {
    if (!supabaseUrl || !supabaseKey || !resendKey || !fromEmail) {
      console.error("Configurazione newsletter incompleta.");
      return res.status(500).json({
        error: "Configurazione newsletter incompleta."
      });
    }

    const { email, website, consent, privacyNoticeAccepted } = req.body || {};

    if (website) {
      return res.status(200).json({
        message: "Se la richiesta è valida, riceverai un'email."
      });
    }

    if (privacyNoticeAccepted !== true) {
      return res.status(400).json({
        error: "Devi prima leggere e confermare la presa visione dell'Informativa sulla Privacy."
      });
    }

    if (consent !== true) {
      return res.status(400).json({
        error: "Devi accettare di ricevere la newsletter."
      });
    }

    const cleanEmail = String(email || "").trim().toLowerCase();

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        error: "Indirizzo email non valido."
      });
    }

    const confirmationToken = crypto.randomBytes(32).toString("hex");
    const confirmationHash = hashToken(confirmationToken);

    const unsubscribeToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeHash = hashToken(unsubscribeToken);

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const lookupUrl =
      `${supabaseUrl}/rest/v1/newsletter_subscribers` +
      `?email=eq.${encodeURIComponent(cleanEmail)}&select=id,status`;

    const lookup = await fetch(lookupUrl, { headers });

    if (!lookup.ok) {
      const detail = await lookup.text();
      console.error("Newsletter lookup failed:", lookup.status, detail);
      throw new Error("Errore nella verifica dell'iscrizione.");
    }

    const existing = await lookup.json();

    if (existing.length && existing[0].status === "confirmed") {
      return res.status(200).json({
        message: "Questa email è già iscritta alla newsletter."
      });
    }

    const subscriber = {
      email: cleanEmail,
      confirmation_token: null,
      confirmation_token_hash: confirmationHash,
      unsubscribe_token: null,
      unsubscribe_token_hash: unsubscribeHash,
      status: "pending",
      consent_at: new Date().toISOString(),
      confirmed_at: null,
      unsubscribed_at: null
    };

    let saveResponse;

    if (existing.length) {
      const updateUrl =
        `${supabaseUrl}/rest/v1/newsletter_subscribers` +
        `?email=eq.${encodeURIComponent(cleanEmail)}`;

      saveResponse = await fetch(updateUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify(subscriber)
      });
    } else {
      saveResponse = await fetch(
        `${supabaseUrl}/rest/v1/newsletter_subscribers`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(subscriber)
        }
      );
    }

    if (!saveResponse.ok) {
      const detail = await saveResponse.text();
      console.error("Newsletter save failed:", saveResponse.status, detail);
      throw new Error("Errore nel salvataggio dell'iscrizione.");
    }

    const confirmUrl =
      `${siteUrl}/api/newsletter-confirm?token=${confirmationToken}`;

    const mailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [cleanEmail],
        subject: "Conferma la tua iscrizione - NEWSGAMING2",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
            <h2>Conferma la tua iscrizione</h2>
            <p>Hai richiesto di ricevere la newsletter di NEWSGAMING2.</p>
            <p>Per confermare, clicca qui:</p>
            <p>
              <a href="${confirmUrl}"
                 style="display:inline-block;padding:12px 20px;background:#00d9ff;color:#07111f;text-decoration:none;border-radius:8px">
                Conferma iscrizione
              </a>
            </p>
            <p>Se non hai richiesto tu l'iscrizione, ignora questa email.</p>
          </div>
        `
      })
    });

    if (!mailResponse.ok) {
      const detail = await mailResponse.text();
      console.error("Newsletter Resend failed:", mailResponse.status, detail);
      return res.status(502).json({
        error: "Iscrizione non completata: impossibile inviare l'email di conferma. Riprova più tardi."
      });
    }

    return res.status(200).json({
      message: "Controlla la tua email e clicca sul link per confermare l'iscrizione."
    });
  } catch (error) {
    console.error("Newsletter subscribe error:", error.message);
    return res.status(500).json({
      error: "Si è verificato un errore. Riprova più tardi."
    });
  }
}