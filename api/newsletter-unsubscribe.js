
const crypto = require("crypto");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (process.env.SITE_URL || "https://www.newsgaming2.it").replace(/\/$/, "");

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
      return res.status(400).send("Link non valido.");
    }

    const tokenHash = hashToken(token);

    const url =
      `${supabaseUrl}/rest/v1/newsletter_subscribers` +
      `?unsubscribe_token_hash=eq.${tokenHash}&status=eq.confirmed&select=email`;

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    };

    const lookup = await fetch(url, { headers });

    if (!lookup.ok) {
      throw new Error("Errore durante la verifica.");
    }

    const subscribers = await lookup.json();

    if (!subscribers.length) {
      return res.status(400).send("Link non valido o già utilizzato.");
    }

    const update = await fetch(
      `${supabaseUrl}/rest/v1/newsletter_subscribers?unsubscribe_token_hash=eq.${tokenHash}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "unsubscribed",
          unsubscribe_token_hash: null
        })
      }
    );

    if (!update.ok) {
      throw new Error("Errore durante la disiscrizione.");
    }

    return res.status(200).send(`
      <html lang="it">
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <body style="background:#07111f;color:white;font-family:Arial;text-align:center;padding:50px 20px">
        <h1 style="color:#00d9ff">Disiscrizione completata</h1>
        <p>Non riceverai più la newsletter NEWSGAMING2.</p>
        <a href="${siteUrl}" style="color:#00d9ff">Torna alla homepage</a>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("Newsletter unsubscribe error:", error.message);
    return res.status(500).send("Errore durante la disiscrizione.");
  }
}
