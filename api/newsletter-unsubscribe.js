import crypto from "node:crypto";

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (process.env.SITE_URL || "https://www.newsgaming2.it").replace(/\/$/, "");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function db(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : [];
}

function page(title, message, token = "") {
  const form = token ? `
    <form method="POST" action="${siteUrl}/api/newsletter-unsubscribe" style="margin:28px auto">
      <input type="hidden" name="token" value="${token}">
      <button type="submit" style="padding:13px 22px;border:0;border-radius:8px;background:#00d9ff;color:#07111f;font-weight:bold;cursor:pointer">Conferma disiscrizione</button>
    </form>
  ` : "";
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="background:#07111f;color:#fff;font-family:Arial;text-align:center;padding:50px 20px"><h1 style="color:#00d9ff">${title}</h1><p>${message}</p>${form}<a href="${siteUrl}" style="color:#00d9ff">Torna a NEWSGAMING2</a></body></html>`;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Metodo non consentito.");
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const token = String(req.query?.token || body.token || "");
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).send("Link di disiscrizione non valido.");
  }

  // I GET mostrano solo una pagina di conferma: nessun dato viene modificato.
  // Il POST del modulo o il POST one-click di List-Unsubscribe esegue l'azione.
  if (req.method === "GET") {
    return res.status(200).send(page(
      "Conferma la disiscrizione",
      "Per interrompere le email della newsletter, conferma qui sotto.",
      token
    ));
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).send("Configurazione non disponibile.");
    }

    const tokenHash = hashToken(token);
    const tokenRows = await db(
      `newsletter_unsubscribe_tokens?token_hash=eq.${tokenHash}&used_at=is.null&select=id,subscriber_id`
    );

    if (tokenRows.length) {
      const subscriberId = tokenRows[0].subscriber_id;
      const updated = await db(
        `newsletter_subscribers?id=eq.${encodeURIComponent(subscriberId)}&status=eq.confirmed`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            status: "unsubscribed",
            unsubscribed_at: new Date().toISOString(),
            unsubscribe_token_hash: null
          })
        }
      );

      await db(`newsletter_unsubscribe_tokens?subscriber_id=eq.${encodeURIComponent(subscriberId)}&used_at=is.null`, {
        method: "PATCH",
        body: JSON.stringify({ used_at: new Date().toISOString() })
      });

      if (!updated.length) {
        return res.status(200).send(page("Disiscrizione già completata", "Non riceverai altre email della newsletter."));
      }
      return res.status(200).send(page("Disiscrizione completata", "Non riceverai più la newsletter di NEWSGAMING2."));
    }

    // Compatibilità con il token presente nella precedente email di benvenuto.
    const legacy = await db(
      `newsletter_subscribers?unsubscribe_token_hash=eq.${tokenHash}&status=eq.confirmed`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_token_hash: null
        })
      }
    );

    if (!legacy.length) {
      return res.status(400).send(page("Link non valido o già utilizzato", "Questo link non è più valido."));
    }
    return res.status(200).send(page("Disiscrizione completata", "Non riceverai più la newsletter di NEWSGAMING2."));
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error.message);
    return res.status(500).send("Si è verificato un errore. Riprova più tardi.");
  }
}
