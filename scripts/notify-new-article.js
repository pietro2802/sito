const fs = require("fs");
const path = require("path");

const file = process.argv[2];
const token = process.env.PUBLISH_TOKEN;
const siteUrl = (process.env.SITE_URL || "https://www.newsgaming2.it").replace(/\/$/, "");

if (!file || !file.startsWith("articoli/") || !file.endsWith(".html")) {
  throw new Error("File articolo non valido.");
}
if (!token) throw new Error("Secret PUBLISH_TOKEN mancante.");

const html = fs.readFileSync(file, "utf8");

function meta(property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
  }
  return "";
}

const title = meta("og:title") || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim();
const description = meta("og:description") || meta("description");
const slug = path.basename(file, ".html");
const url = `${siteUrl}/${file}`;

if (!title) throw new Error(`Titolo non trovato in ${file}`);

fetch(`${siteUrl}/api/newsletter-publish`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-publish-token": token
  },
  body: JSON.stringify({ title, description, slug, url })
}).then(async (response) => {
  const body = await response.text();
  if (!response.ok) throw new Error(`API newsletter ${response.status}: ${body}`);
  console.log(`Notifica completata per "${title}": ${body}`);
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
