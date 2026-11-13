const crypto = require("crypto");

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const publishToken = process.env.NEWSLETTER_PUBLISH_TOKEN;
const siteUrl = (process.env.SITE_URL || "https://www.newsgaming2.it").replace(/\/$/, "");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const escapeHtml = (value) =>
  String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

async function supabase(path, options = {}) {
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
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${body.slice(0, 500)}`);
  }
  return body ? JSON.parse(body) : [];
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  try {
    if (!supabaseUrl || !supabaseKey || !resendKey || !fromEmail || !publishToken) {
      return res.status(500).json({ error: "Configurazione newsletter incompleta." });
    }

    const suppliedToken = req.headers["x-publish-token"];
    if (!safeEqual(suppliedToken, publishToken)) {
      return res.status(401).json({ error: "Non autorizzato." });
    }

    const { title, description, url, slug } = req.body || {};
    const cleanTitle = String(title || "").trim().slice(0, 180);
    const cleanDescription = String(description || "").trim().slice(0, 400);
    const cleanSlug = String(slug || "").trim();

    let articleUrl;
    try { articleUrl = new URL(String(url || "")); } catch (_) {}
    if (
      !cleanTitle || !cleanSlug || !/^[a-z0-9][a-z0-9-]{1,140}$/.test(cleanSlug) ||
      !articleUrl || articleUrl.protocol !== "https:" ||
      !["newsgaming2.it", "www.newsgaming2.it"].includes(articleUrl.hostname) ||
      !articleUrl.pathname.startsWith("/articoli/")
    ) {
      return res.status(400).json({ error: "Dati articolo non validi." });
    }

    // Registro univoco: lo stesso articolo non viene notificato due volte.
    const created = await supabase("newsletter_article_notifications?on_conflict=slug", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify([{ slug: cleanSlug, title: cleanTitle, article_url: articleUrl.toString(), status: "processing" }])
    });

    if (!created.length) {
      const existing = await supabase(
        `newsletter_article_notifications?slug=eq.${encodeURIComponent(cleanSlug)}&select=status`
      );
      if (existing[0]?.status === "sent") {
        return res.status(200).json({ message: "Articolo già notificato.", duplicate: true });
      }
      if (existing[0]?.status === "processing") {
        return res.status(409).json({ error: "Notifica già in elaborazione." });
      }
      await supabase(`newsletter_article_notifications?slug=eq.${encodeURIComponent(cleanSlug)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "processing", title: cleanTitle, article_url: articleUrl.toString(), delivered_count: 0 })
      });
    }

    let delivered = 0;
    try {
      let subscribers = [];
      for (let offset = 0; ; offset += 500) {
        const page = await supabase(
          `newsletter_subscribers?status=eq.confirmed&select=id,email&order=id.asc&limit=500&offset=${offset}`
        );
        subscribers = subscribers.concat(page);
        if (page.length < 500) break;
      }

      // Nessun invio se non ci sono iscritti confermati.
      for (let start = 0; start < subscribers.length; start += 100) {
        const batch = subscribers.slice(start, start + 100);
        const prepared = batch.map((subscriber) => {
          const token = crypto.randomBytes(32).toString("hex");
          return {
            subscriber_id: subscriber.id,
            token_hash: hashToken(token),
            unsubscribeUrl: `${siteUrl}/api/newsletter-unsubscribe?token=${token}`,
            email: subscriber.email
          };
        });

        await supabase("newsletter_unsubscribe_tokens", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(prepared.map(({ subscriber_id, token_hash }) => ({
            subscriber_id, token_hash
          })))
        });

        const messages = prepared.map((item) => ({
          from: fromEmail,
          to: [item.email],
          subject: `Nuovo articolo su NEWSGAMING2: ${cleanTitle}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033;line-height:1.6">
              <h2 style="color:#087e9b">Nuovo articolo su NEWSGAMING2</h2>
              <h1>${escapeHtml(cleanTitle)}</h1>
              ${cleanDescription ? `<p>${escapeHtml(cleanDescription)}</p>` : ""}
              <p><a href="${articleUrl.toString()}" style="display:inline-block;padding:12px 20px;background:#00d9ff;color:#07111f;text-decoration:none;border-radius:8px;font-weight:bold">Leggi l'articolo</a></p>
              <hr>
              <p style="font-size:12px;color:#667085">Ricevi questa email perché hai confermato l'iscrizione alla newsletter di NEWSGAMING2.</p>
              <p style="font-size:12px"><a href="${item.unsubscribeUrl}">Disiscriviti dalla newsletter</a></p>
            </div>
          `,
          headers: {
            "List-Unsubscribe": `<${item.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
          }
        }));

        const mailResponse = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `ng-newsletter-${cleanSlug}-${Math.floor(start / 100)}`
          },
          body: JSON.stringify(messages)
        });
        if (!mailResponse.ok) {
          const detail = await mailResponse.text();
          throw new Error(`Resend ${mailResponse.status}: ${detail.slice(0, 500)}`);
        }
        delivered += batch.length;
      }

      await supabase(`newsletter_article_notifications?slug=eq.${encodeURIComponent(cleanSlug)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "sent", delivered_count: delivered, sent_at: new Date().toISOString() })
      });

      return res.status(200).json({ message: "Notifica inviata.", delivered });
    } catch (error) {
      await supabase(`newsletter_article_notifications?slug=eq.${encodeURIComponent(cleanSlug)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "failed", delivered_count: delivered })
      }).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error("Newsletter publish error:", error.message);
    return res.status(500).json({ error: "Invio della newsletter non riuscito." });
  }
}
