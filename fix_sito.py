import json
import os
import re
from pathlib import Path

ROOT = Path(".")


def clean_head_links(html: str) -> str:
    def fix_head(match):
        head = match.group(0)
        while re.search(r"<a\b[^>]*>.*?</a>", head, flags=re.I | re.S):
            head = re.sub(r"<a\b[^>]*>(.*?)</a>", r"\1", head, flags=re.I | re.S)
        return head

    return re.sub(r"<head\b[^>]*>.*?</head>", fix_head, html, flags=re.I | re.S)


def fix_nested_body_links(html: str) -> str:
    while re.search(r"<a\b[^>]*>\s*(<a\b[^>]*>.*?</a>)\s*</a>", html, flags=re.I | re.S):
        html = re.sub(
            r"<a\b[^>]*>\s*(<a\b[^>]*>.*?</a>)\s*</a>",
            r"\1",
            html,
            flags=re.I | re.S,
        )
    return html


def strip_adsense_and_placeholders(html: str) -> str:
    # Rimuove lo script AdSense finche' non viene configurata una CMP certificata
    html = re.sub(
        r'\s*<script[^>]*pagead2\.googlesyndication\.com[^>]*>\s*</script>',
        "",
        html,
        flags=re.I | re.S,
    )
    # Rimuove i riquadri tratteggiati vuoti "Spazio pubblicitario"
    html = re.sub(
        r'\s*<aside\s+class="ad-slot[^"]*"[^>]*>.*?</aside>',
        "",
        html,
        flags=re.I | re.S,
    )
    return html


def strip_code_fences(text: str) -> str:
    text = text.lstrip("\ufeff")
    text = re.sub(r"^\s*```html\s*\r?\n?", "", text, flags=re.I)
    text = re.sub(r"\r?\n?```\s*$", "\n", text)
    return text


# 1. Elimina il file vuoto "mm"
mm_file = ROOT / "mm"
if mm_file.exists() and mm_file.stat().st_size == 0:
    mm_file.unlink()
    print("Rimosso file vuoto: mm")

# 2. Ripulisce area-personale.html e community.html dai ```html
for fname in ["area-personale.html", "community.html"]:
    p = ROOT / fname
    if p.exists():
        p.write_text(strip_code_fences(p.read_text(encoding="utf-8")), encoding="utf-8")
        print(f"Ripulito markdown fence in: {fname}")

# 3. Sistema index.html
index_path = ROOT / "index.html"
if index_path.exists():
    html = index_path.read_text(encoding="utf-8")
    html = re.sub(r'<style id="ng2-home-style">.*?</style>', "", html, flags=re.S)
    html = re.sub(
        r'<section id="ng2-home-enhancements".*?</section>',
        "",
        html,
        flags=re.S,
    )
    # Rimuove gli srcset specifici di Netlify Image CDN (incompatibili con Vercel)
    html = re.sub(r'\s*srcset="/\.netlify/images\?[^"]*"', "", html)
    # Togli il blocco rigido a 42 articoli cosi' i nuovi articoli nel JSON funzionano
    html = html.replace("data.articles.length !== 42", "data.articles.length === 0")
    html = strip_adsense_and_placeholders(html)
    if "</body>" not in html.lower():
        html = html.rstrip() + "\n</body></html>\n"
    index_path.write_text(html, encoding="utf-8")
    print("Aggiornato: index.html")

# 4. Sistema tutti gli articoli in /articoli/*.html
articles_dir = ROOT / "articoli"
if articles_dir.exists():
    for path in sorted(articles_dir.glob("*.html")):
        html = path.read_text(encoding="utf-8")
        html = clean_head_links(html)
        html = fix_nested_body_links(html)
        html = strip_adsense_and_placeholders(html)

        if path.name == "ps5-vendite-2026-100-milioni.html":
            html = re.sub(
                r'</header>.*?<div class="article-layout">',
                '</header><div class="article-layout">',
                html,
                flags=re.S,
            )
        elif path.name == "steam-deck-vs-ally.html":
            html = re.sub(
                r'</header>.*?<div class="article-layout">',
                '</header><div class="article-layout">',
                html,
                flags=re.S,
            )
        elif path.name == "ps5-pro-analisi.html":
            html = html.replace(
                "https://gmedia.playstation.com/is/image/SIEPDC/ps5-pro-overview-homepage-hero-desktop-background-01-en-16aug24?$100px$=",
                "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1400&q=82",
            )

        # Uniforma header dei due articoli del 12 novembre
        if path.name in {
            "metaphor-refantazio-switch-2-lancio.html",
            "zelda-ocarina-time-52-milioni-switch-2.html",
        }:
            if "neon-futuristico.css" not in html:
                html = html.replace(
                    "</head>",
                    '<link rel="stylesheet" href="/assets/neon-futuristico.css">\n</head>',
                )
            html = re.sub(
                r"<header>\s*<a href=\"/\">NEWS<span>GAMING2</span></a>\s*</header>",
                '<div class="topline"><header class="wrap nav"><a class="brand" href="../index.html">NEWS<span>GAMING2</span></a><nav class="navlinks"><a href="../index.html">Home</a><a href="../scopri.html">Scopri</a><a href="../giochi.html">Giochi</a><a href="../community.html">Community</a><a href="../about.html">Chi siamo</a><a href="../contatti.html">Contatti</a><a href="/account.html">Area personale</a></nav></header></div>',
                html,
                flags=re.S,
            )

        path.write_text(html, encoding="utf-8")
    print("Ripuliti e allineati tutti gli articoli in /articoli/")

# 5. Aggiorna menu su about.html e contatti.html + rimuove AdSense
FULL_NAV = '<nav class="navlinks"><a href="index.html">Home</a><a href="scopri.html">Scopri</a><a href="giochi.html">Giochi</a><a href="community.html">Community</a><a href="about.html">Chi siamo</a><a href="contatti.html">Contatti</a><a href="/account.html">Area personale</a></nav>'

for fname in ["about.html", "contatti.html"]:
    p = ROOT / fname
    if p.exists():
        html = p.read_text(encoding="utf-8")
        html = re.sub(r'<nav class="navlinks">.*?</nav>', FULL_NAV, html, flags=re.S)
        html = strip_adsense_and_placeholders(html)
        p.write_text(html, encoding="utf-8")
        print(f"Aggiornato: {fname}")

# 6. Aggiorna privacy.html (Vercel + Supabase + AdSense disattivato, nessun riferimento extra)
privacy_path = ROOT / "privacy.html"
if privacy_path.exists():
    privacy_html = """<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Informativa privacy NEWSGAMING2"><title>Privacy Policy | NEWSGAMING2</title><style>
:root{color-scheme:dark;--bg:#090d14;--panel:#111a28;--line:#26364b;--text:#eef5ff;--muted:#a9b7c9;--cyan:#63e6f4;--max:1180px}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 12% -5%,#142b40 0,transparent 35%),var(--bg);color:var(--text);font:16px/1.75 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(var(--max),calc(100% - 36px));margin:auto}.topline{border-bottom:1px solid var(--line);background:#0b111bdc}.nav{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-size:1.45rem;font-weight:950;letter-spacing:.08em;color:#fff}.brand span{color:var(--cyan)}.navlinks{display:flex;gap:20px;align-items:center;font-weight:650}.navlinks a{color:#d6e4f4}.eyebrow{color:var(--cyan);font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;font-weight:800}.legal{max-width:850px;margin:38px auto;padding:0 20px}.legal h1{font-size:2.4rem;line-height:1.15}.legal h2{margin-top:30px;color:var(--cyan)}.legal p,.legal li{color:#d5dfeb}footer{border-top:1px solid var(--line);margin-top:60px;padding:30px 0 40px;color:var(--muted);font-size:.9rem}.footlinks{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0}@media(max-width:850px){.navlinks{gap:12px;font-size:.9rem}}@media(max-width:580px){.nav{align-items:flex-start;padding:15px 0;flex-direction:column}.navlinks{flex-wrap:wrap}}
</style><link rel="stylesheet" href="/assets/neon-futuristico.css"></head><body><div class="topline"><header class="wrap nav"><a class="brand" href="index.html">NEWS<span>GAMING2</span></a>""" + FULL_NAV + """</header></div><main class="legal"><p><a href="index.html">← Torna alla home</a></p><div class="eyebrow">Informativa</div><h1>Privacy Policy</h1><p><em>Ultimo aggiornamento: 12 novembre 2026</em></p><h2>1. Titolare e contatti</h2><p>Il progetto editoriale <strong>NEWSGAMING2</strong> può essere contattato all’indirizzo email <a href="mailto:newsgaming2@libero.it">newsgaming2@libero.it</a> per informazioni, chiarimenti o richieste relative ai dati trattati.</p><h2>2. Dati trattati</h2><ul><li><strong>Dati tecnici di navigazione:</strong> la consultazione del sito comporta il normale trattamento tecnico di richieste di rete (indirizzo IP, user-agent, data e ora) necessario per erogare le pagine e proteggere il servizio.</li><li><strong>Account, profili e community:</strong> se ti registri volontariamente, vengono trattati indirizzo email, nome visualizzato, eventuali dati inseriti nel profilo e contributi pubblicati (commenti, reazioni, segnalazioni).</li><li><strong>Newsletter (facoltativa):</strong> se ti iscrivi, l’indirizzo email è utilizzato esclusivamente per l’invio della conferma (double opt-in) e del riepilogo editoriale, con possibilità di disiscrizione in ogni momento.</li><li><strong>Email di contatto:</strong> i messaggi inviati all’indirizzo di contatto sono utilizzati solo per rispondere alle richieste.</li></ul><h2>3. Servizi utilizzati</h2><ul><li><strong>Hosting (Vercel):</strong> il sito e le funzioni lato server (incluse iscrizione newsletter e cancellazione account) sono ospitati su infrastruttura Vercel.</li><li><strong>Autenticazione e database (Supabase):</strong> gestione account, recupero password, salvataggio sessione locale sul dispositivo e contenuti della community.</li></ul><h2>4. Contenuti esterni</h2><p>Le pagine possono mostrare immagini esterne e video YouTube incorporati tramite <code>youtube-nocookie.com</code>. I video non vengono caricati automaticamente: vengono richiesti solo dopo il clic sul pulsante “Carica video”.</p><h2>5. Pubblicità e analytics</h2><p>In questa versione <strong>non sono attivi</strong> annunci Google AdSense né strumenti di analytics/profilazione. Prima di attivare eventuale pubblicità nello SEE, nel Regno Unito o in Svizzera, verrà integrata una CMP certificata Google (TCF) e questa informativa sarà aggiornata.</p><h2>6. Diritti degli utenti</h2><p>Gli utenti registrati possono gestire o richiedere la cancellazione del proprio account dall’area personale oppure scrivere a <a href="mailto:newsgaming2@libero.it">newsgaming2@libero.it</a>.</p></main><footer><div class="wrap"><strong>NEWSGAMING2</strong><div class="footlinks"><a href="/index.html">Home</a><a href="/about.html">Chi siamo</a><a href="/contatti.html">Contatti</a><a href="/privacy.html">Privacy</a><a href="/cookie-policy.html">Cookie</a></div><p>Progetto editoriale indipendente. I marchi citati appartengono ai rispettivi titolari. NEWSGAMING2 non è affiliato ai produttori menzionati.</p><p>© 2026 NEWSGAMING2</p></div></footer></body></html>
"""
    privacy_path.write_text(privacy_html, encoding="utf-8")
    print("Aggiornato: privacy.html")

# 7. Aggiorna cookie-policy.html (coerente con Vercel + AdSense disattivato)
cookie_path = ROOT / "cookie-policy.html"
if cookie_path.exists():
    cookie_html = """<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Informativa cookie NEWSGAMING2"><title>Cookie Policy | NEWSGAMING2</title><style>
:root{color-scheme:dark;--bg:#090d14;--panel:#111a28;--line:#26364b;--text:#eef5ff;--muted:#a9b7c9;--cyan:#63e6f4;--max:1180px}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 12% -5%,#142b40 0,transparent 35%),var(--bg);color:var(--text);font:16px/1.75 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(var(--max),calc(100% - 36px));margin:auto}.topline{border-bottom:1px solid var(--line);background:#0b111bdc}.nav{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-size:1.45rem;font-weight:950;letter-spacing:.08em;color:#fff}.brand span{color:var(--cyan)}.navlinks{display:flex;gap:20px;align-items:center;font-weight:650}.navlinks a{color:#d6e4f4}.eyebrow{color:var(--cyan);font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;font-weight:800}.legal{max-width:850px;margin:38px auto;padding:0 20px}.legal h1{font-size:2.4rem;line-height:1.15}.legal h2{margin-top:30px;color:var(--cyan)}.legal p,.legal li{color:#d5dfeb}footer{border-top:1px solid var(--line);margin-top:60px;padding:30px 0 40px;color:var(--muted);font-size:.9rem}.footlinks{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0}@media(max-width:850px){.navlinks{gap:12px;font-size:.9rem}}@media(max-width:580px){.nav{align-items:flex-start;padding:15px 0;flex-direction:column}.navlinks{flex-wrap:wrap}}
</style><link rel="stylesheet" href="/assets/neon-futuristico.css"></head><body><div class="topline"><header class="wrap nav"><a class="brand" href="index.html">NEWS<span>GAMING2</span></a>""" + FULL_NAV + """</header></div><main class="legal"><p><a href="index.html">← Torna alla home</a></p><div class="eyebrow">Preferenze</div><h1>Cookie Policy</h1><p><em>Ultimo aggiornamento: 12 novembre 2026</em></p><h2>Memoria locale tecnica</h2><p>Il sito utilizza la memoria locale del browser esclusivamente per funzioni tecniche: ricordare la chiusura dell’avviso informativo e mantenere la sessione di accesso Supabase sul dispositivo quando l’utente effettua il login.</p><h2>Contenuti esterni</h2><p>I video YouTube incorporati nelle pagine articolo vengono caricati tramite <code>youtube-nocookie.com</code> solo quando l’utente preme “Carica video”.</p><h2>Pubblicità e misurazione</h2><p>Google AdSense e gli strumenti di analisi non sono attivi in questa versione. Prima di attivare annunci o script di terze parti soggetti a consenso, verrà configurata una CMP certificata Google con supporto TCF.</p></main><footer><div class="wrap"><strong>NEWSGAMING2</strong><div class="footlinks"><a href="/index.html">Home</a><a href="/about.html">Chi siamo</a><a href="/contatti.html">Contatti</a><a href="/privacy.html">Privacy</a><a href="/cookie-policy.html">Cookie</a></div><p>Progetto editoriale indipendente. I marchi citati appartengono ai rispettivi titolari. NEWSGAMING2 non è affiliato ai produttori menzionati.</p><p>© 2026 NEWSGAMING2</p></div></footer></body></html>
"""
    cookie_path.write_text(cookie_html, encoding="utf-8")
    print("Aggiornato: cookie-policy.html")

# 8. Rende scopri.html dinamico tramite /data/articoli.json e senza AdSense
scopri_path = ROOT / "scopri.html"
if scopri_path.exists():
    scopri_html = scopri_path.read_text(encoding="utf-8")
    scopri_html = strip_adsense_and_placeholders(scopri_html)
    dynamic_script = """<script>
const track=document.getElementById('track'),counter=document.getElementById('counter'),bar=document.getElementById('bar');
let slides=[...track.querySelectorAll('.slide')];
function update(){if(!slides.length)return;let i=0,center=track.scrollLeft+track.clientWidth*.35;slides.forEach((s,n)=>{if(s.offsetLeft<=center)i=n});counter.textContent=`${slides.length} articoli · ${i+1} / ${slides.length}`;bar.style.width=((i+1)/slides.length*100)+'%'}
function move(d){if(!slides.length)return;let step=slides[0].getBoundingClientRect().width+16;track.scrollBy({left:d*step,behavior:'smooth'})}
document.getElementById('prev').addEventListener('click',()=>move(-1));document.getElementById('next').addEventListener('click',()=>move(1));track.addEventListener('scroll',update,{passive:true});
fetch('/data/articoli.json').then(r=>r.ok?r.json():null).then(data=>{
  if(!data||!Array.isArray(data.articles)||!data.articles.length)return;
  const sorted=[...data.articles].sort((a,b)=>b.date.localeCompare(a.date));
  const frag=document.createDocumentFragment();
  sorted.forEach(a=>{
    const art=document.createElement('article');art.className='slide';
    const cov=document.createElement('a');cov.className='cover';cov.href=a.url;
    const img=document.createElement('img');img.src=a.image;img.alt=a.imageAlt||a.title;img.loading='lazy';cov.append(img);
    const body=document.createElement('div');body.className='body';
    const tag=document.createElement('span');tag.className='tag';tag.textContent=a.category;
    const h2=document.createElement('h2');const al=document.createElement('a');al.href=a.url;al.textContent=a.title;h2.append(al);
    const p=document.createElement('p');p.textContent=a.description;
    const open=document.createElement('a');open.className='open';open.href=a.url;open.textContent='Apri articolo ↗';
    body.append(tag,h2,p,open);art.append(cov,body);frag.append(art);
  });
  track.replaceChildren(frag);
  slides=[...track.querySelectorAll('.slide')];
  update();
}).catch(()=>{update();});
update();
</script></body></html>"""
    scopri_html = re.sub(r"<script>.*?</script>\s*</body>\s*</html>", dynamic_script, scopri_html, flags=re.S)
    scopri_path.write_text(scopri_html, encoding="utf-8")
    print("Aggiornato: scopri.html (ora legge data/articoli.json)")

# 9. Aggiorna data/articoli.json (fix foto Switch 2 + aggiunta 3 articoli mancanti)
json_path = ROOT / "data" / "articoli.json"
if json_path.exists():
    data = json.loads(json_path.read_text(encoding="utf-8"))
    articles = data.get("articles", [])

    for item in articles:
        if item.get("url") == "articoli/nintendo-switch-2-vendite-trimestre-novembre-2026.html":
            item["image"] = "https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/index/index_soloProduct"
            item["imageAlt"] = "Nintendo Switch 2: console e dati di vendita trimestrali"

    existing_urls = {item.get("url") for item in articles}
    missing = [
        {
            "id": "metaphor: refantazio debutta su nintendo switch 2",
            "title": "Metaphor: ReFantazio debutta su Nintendo Switch 2: tutte le novità",
            "category": "Nintendo",
            "date": "2026-11-12",
            "url": "articoli/metaphor-refantazio-switch-2-lancio.html",
            "image": "https://metaphor.atlus.com/media/img/story/ss-story.webp",
            "imageAlt": "Scena ambientale di Metaphor: ReFantazio",
            "description": "Metaphor: ReFantazio arriva su Nintendo Switch 2 con tre modalità grafiche e un nuovo prezzo."
        },
        {
            "id": "zelda: ocarina of time supera 5,2 milioni di copie su switch 2",
            "title": "Zelda: Ocarina of Time supera 5,2 milioni di copie in soli quattro giorni",
            "category": "Nintendo",
            "date": "2026-11-12",
            "url": "articoli/zelda-ocarina-time-52-milioni-switch-2.html",
            "image": "https://images.nintendolife.com/e2a0e0ba51b37/zelda.large.jpg",
            "imageAlt": "The Legend of Zelda: Ocarina of Time",
            "description": "Il remake per Nintendo Switch 2 supera 5,2 milioni di copie vendute nei primi quattro giorni dal lancio."
        },
        {
            "id": "gta 6: cosa raccontano davvero vice city e i trailer",
            "title": "GTA 6: cosa raccontano davvero Vice City e i trailer",
            "category": "News e approfondimenti",
            "date": "2025-12-31",
            "url": "articoli/gta-6-vice-city.html",
            "image": "https://images.unsplash.com/photo-1749342235844-98f55c5ed87b?auto=format&fit=crop&w=900&q=78",
            "imageAlt": "GTA 6: ambientazione Vice City",
            "description": "Un’analisi di ambientazione, personaggi e linguaggio visivo, separando ciò che è stato mostrato dalle ipotesi della community."
        },
    ]
    for m in missing:
        if m["url"] not in existing_urls:
            articles.append(m)

    data["articles"] = articles
    data["updatedAt"] = "2026-11-12"
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Aggiornato data/articoli.json ({len(articles)} articoli totali)")
