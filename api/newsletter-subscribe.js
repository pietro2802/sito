
const crypto = require("crypto");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const siteUrl = (process.env.SITE_URL || "https://www.newsgaming2.it").replace(/\/$/, "");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  try {
    if (!supabaseUrl || !supabaseKey || !resendKey || !fromEmail) {
      return res.status(500).json({
        error: "Configurazione newsletter incompleta su Vercel."
      });
    }

    const { email, website, consent } = req.body || {};

    // Campo anti-spam invisibile
    if (website) {
      return res.status(200).json({
        message: "Se l'indirizzo è valido, riceverai un'email."
      });
    }

    if (consent !== true) {
      return res.status(400).json({
        error: "Devi accettare di ricevere la newsletter."
      });
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        error: "Inserisci un indirizzo email valido."
      });
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    };

    const filterUrl =
      `${supabaseUrl}/rest/v1/newsletter_subscribers` +
      `?email=eq.${encodeURIComponent(normalizedEmail)}&select=email,status`;

    const lookup = await fetch(filterUrl, { headers });

    if (!lookup.ok) {
      throw new Error("Errore durante la verifica dell'iscrizione.");
    }

    const existing = await lookup.json();

    if (existing[0]?.status === "confirmed") {
      return res.status(200).json({
        message: "Questo indirizzo è già iscritto alla newsletter."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const subscriberData = {
      email: normalizedEmail,
      status: "pending",
      consent_at: new Date().toISOString(),
      confirmation_token_hash: tokenHash,
      confirmed_at: null,
      unsubscribe_token_hash: null
    };

    let saveResponse;

    if (existing.length > 0) {
      saveResponse = await fetch(filterUrl.replace("&select=email,status", ""), {
        method: "PATCH",
        headers,
        body: JSON.stringify(subscriberData)
      });
    } else {
      saveResponse = await fetch(
        `${supabaseUrl}/rest/v1/newsletter_subscribers`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(subscriberData)
        }
      );
    }

    if (!saveResponse.ok) {
      throw new Error("Non è stato possibile salvare l'iscrizione.");
    }

    const confirmationUrl =
      `${siteUrl}/api/newsletter-confirm?token=${token}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [normalizedEmail],
        subject: "Conferma la tua iscrizione a NEWSGAMING2",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
            <h2>Conferma la tua iscrizione!</h2>
            <p>Hai richiesto di ricevere la newsletter di NEWSGAMING2.</p>
            <p>Per confermare, clicca sul pulsante qui sotto:</p>
            <p>
              <a href="${confirmationUrl}"
                 style="display:inline-block;padding:13px 20px;background:#00d9ff;color:#06111d;text-decoration:none;border-radius:8px;font-weight:bold">
                Conferma iscrizione
              </a>
            </p>
            <p>Se non hai richiesto tu l'iscrizione, ignora questa email.</p>
            <p>NEWSGAMING2</p>
          </div>
        `
      })
    });

    if (!emailResponse.ok) {
      throw new Error("Resend non è riuscito a inviare l'email.");
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
