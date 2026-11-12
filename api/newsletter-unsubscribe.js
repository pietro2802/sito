
const crypto = require("crypto");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (
  process.env.SITE_URL || "https://www.newsgaming2.it"
).replace(/\/$/, "");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("Metodo non consentito.");
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).send("Configurazione non disponibile.");
    }

    const token = String(req.query.token || "");

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).send("Link di disiscrizione non valido.");
    }

    const tokenHash = hashToken(token);

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const updateUrl =
      `${supabaseUrl}/rest/v1/newsletter_subscribers` +
      `?unsubscribe_token_hash=eq.${tokenHash}` +
      `&status=eq.confirmed`;

    const response = await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        unsubscribe_token_hash: null
      })
    });

    if (!response.ok) {
      throw new Error("Errore durante la disiscrizione.");
    }

    const updated = await response.json();

    if (!updated.length) {
      return res.status(400).send(`
        <h2>Link non valido o già utilizzato</h2>
        <p><a href="${siteUrl}">Torna a NEWSGAMING2</a></p>
      `);
    }

    return res.status(200).send(`
      <!doctype html>
      <html lang="it">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Disiscrizione completata</title>
      </head>
      <body style="background:#07111f;color:#fff;font-family:Arial;text-align:center;padding:50px 20px">
        <h1 style="color:#00d9ff">Disiscrizione completata</h1>
        <p>Non riceverai più la newsletter di NEWSGAMING2.</p>
        <a href="${siteUrl}" style="color:#00d9ff">Torna alla homepage</a>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("Newsletter unsubscribe error:", error.message);
    return res.status(500).send("Si è verificato un errore. Riprova più tardi.");
  }
}
