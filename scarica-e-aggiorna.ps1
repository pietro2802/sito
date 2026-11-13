$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = $PSScriptRoot
$imgDir = Join-Path $root "immagini\articoli"
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    "Accept"     = "image/webp,image/png,image/jpeg,*/*;q=0.8"
}

# URL a tema gia presenti nei file del tuo sito
$sorgenti = @{
    "assetto-corsa-competizione"                         = "https://assettocorsa.gg/wp-content/uploads/805550_20240122195948_1-1920x804.jpg"
    "cloud-gaming-smart-tv-controller-2026"              = "https://xboxwire.thesourcemediaassets.com/sites/2/2025/12/cloud-65398ce554ecb88763a0.jpg"
    "come-scegliere-smartphone-gaming-2026"              = "https://press.asus.com/assets/w_1266%2Ch_844/c718ab6e-074c-4780-ba69-33113f508ba3/2024903-0444_edit_edit_V1%20%281%29.jpg"
    "elden-ring-guida"                                   = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg"
    "fc-ultimate-team-budget"                            = "https://drop-assets.ea.com/images/2KVQq4lSBcPUJct6DEjdic/c06c2dc0e4ffc9a213fd1e8d8a7c2e72/FC26_Rev_Stadium_Clubs_16x9.jpg?im=AspectCrop%3D%2816%2C9%29%2CxPosition%3D0.5%2CyPosition%3D0.5"
    "fortnite-impostazioni"                              = "https://upload.wikimedia.org/wikipedia/commons/3/36/Fortnite.png"
    "game-pass-cloud"                                    = "https://news.xbox.com/en-us/wp-content/uploads/sites/2/2024/06/Xbox-Game-Pass-Logo.jpg"
    "giochi-mobile-novita-2026"                          = "https://images.contentstack.io/v3/assets/blt7f746f0684174ee8/blt73be49a32aef8316/697b336c10728962af06748e/download"
    "gta-6-festival-miami-novembre-2026"                 = "https://global-img.gamergen.com/grand-theft-auto-vi-gta-6-46-06-05-2025_0001047718.jpg"
    "gta-6-preload-ps5-novembre-2026"                    = "https://global-img.gamergen.com/grand-theft-auto-vi-gta-6-46-06-05-2025_0001047718.jpg"
    "gta-6-vice-city"                                    = "https://global-img.gamergen.com/grand-theft-auto-vi-gta-6-46-06-05-2025_0001047718.jpg"
    "honkai-nexus-anima-beta-primavera-2027"             = "https://img.game8.jp/12701893/b65857d0574f42808e7144226c3dea22.webp/original"
    "horror-videogiochi"                                 = "https://gmedia.playstation.com/is/image/SIEPDC/silent-hill-2-screenshot-fog-en-29may24"
    "league-of-legends-base"                             = "https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map11.png"
    "metaphor-refantazio-switch-2-lancio"                = "https://metaphor.atlus.com/media/img/story/ss-story.webp"
    "monitor-oled-ips"                                   = "https://storage-asset.msi.com/global/picture/image/feature/monitor/mag-272up-qd-oled-x24/kv-pd.png"
    "monster-hunter-wilds"                               = "https://cdn.capcom-unity.com/2025/04/MHWilds-naramereshkigal-Final-1024x576.jpg"
    "nintendo-switch-2-giochi-2026"                      = "https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/features/mode-tv"
    "nintendo-switch-2-vendite-trimestre-novembre-2026"  = "https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/ccb3e8ca3c296e21a8c933e8369031511589d0ef6b079cf5bb3667b09893482c/index/index_soloProduct"
    "path-of-exile-2-uscita-early-access-dicembre-2026"  = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2694490/header.jpg"
    "ps5-pro-analisi"                                    = "https://gmedia.playstation.com/is/image/SIEPDC/ps5-console-product-thumbnail-01-en-14sep21"
    "ps5-vendite-2026-100-milioni"                       = "https://gmedia.playstation.com/is/image/SIEPDC/ps5-console-product-thumbnail-01-en-14sep21"
    "scegliere-videogiochi"                              = "https://upload.wikimedia.org/wikipedia/commons/8/82/NES-Console-Set.jpg"
    "silent-hill-2-remake"                               = "https://gmedia.playstation.com/is/image/SIEPDC/silent-hill-2-screenshot-fog-en-29may24"
    "sonic-racing-crossworlds-anno-2"                    = "https://sonic.sega.jp/sonic.sega.jp/SonicChannel/upload_images/screenshot/2605_0001.jpg"
    "steam-deck-vs-ally"                                 = "https://cdn.fastly.steamstatic.com/steamdeck/images/press/renderings/press_oled_orb_thumb.jpg"
    "storia-console"                                     = "https://upload.wikimedia.org/wikipedia/commons/8/82/Nintendo-Entertainment-System-NES-Console-FL.jpg"
    "switch-2-hardware"                                  = "https://assets.nintendo.com/image/upload/q_auto%3Abest/f_auto/dpr_2.0/ncom/My%20Nintendo%20Store/EN-US/Nintendo%20Switch%202/Controllers/Joy-Con%202/123677-nintendo-switch-2-joy-con-2-set-light-blue-light-red-package-front-2000x2000"
    "switch-2-ocarina-of-time-lancio-fisico-regno-unito" = "https://images.nintendolife.com/e2a0e0ba51b37/zelda.large.jpg"
    "the-witcher-4-ufficiale"                            = "https://press.cdprojektred.com/_next/image?q=75&url=https%3A%2F%2Fpress.cdn.cdpr.app%2Fmedia%2Fthumbnails%2F1fc0d10c46b1200f6a542f200b1fee61dc6e75cd_q90_680x680.png&w=640"
    "top-10-giochi-mobile-2026"                          = "https://images.contentstack.io/v3/assets/blt7f746f0684174ee8/blt73be49a32aef8316/697b336c10728962af06748e/download"
    "uscite-videogiochi-9-15-novembre-2026"              = "https://cdn.footballmanager.com/site/2026-09/Header.jpg"
    "warzone-impostazioni"                               = "https://upload.wikimedia.org/wikipedia/commons/e/e6/Call_of_Duty_Warzone_Logo.png"
    "windows-11-fps"                                     = "https://msftstories.thesourcemediaassets.com/sites/620/2021/09/Hero-Bloom-Logo-1000x563.jpg"
    "worlds-2026-blg-gen-g-finale"                       = "https://www.cutxeventcenter.com/assets/img/Worlds-2026-Primary-Image-71bcda3161.png"
    "wow-forever-hotfix-esperienza-dungeon-novembre-2026"= "https://bnetcmsus-a.akamaihd.net/cms/blog_header/9u/9UXC0XRFWRX31756509452053.png"
    "xbox-app-pc-cloud-piu-veloce-insider-novembre-2026" = "https://upload.wikimedia.org/wikipedia/commons/a/a4/Xbox_Cloud_Gaming_logo.png"
    "xbox-game-pass-novembre-2026"                       = "https://news.xbox.com/en-us/wp-content/uploads/sites/2/2024/06/Xbox-Game-Pass-Logo.jpg"
    "zelda-ocarina-time-52-milioni-switch-2"             = "https://images.nintendolife.com/e2a0e0ba51b37/zelda.large.jpg"
}

Write-Host "1) Scaricamento immagini in immagini\articoli\..." -ForegroundColor Cyan
foreach ($slug in ($sorgenti.Keys | Sort-Object)) {
    $giaPresente = Get-ChildItem -Path $imgDir -Filter "$slug.*" -ErrorAction SilentlyContinue |
        Where-Object { @(".webp",".jpg",".jpeg",".png") -contains $_.Extension.ToLowerInvariant() } |
        Select-Object -First 1
    if ($giaPresente) {
        Write-Host "  [GIA PRESENTE] $($giaPresente.Name)" -ForegroundColor DarkGray
        continue
    }

    $temp = Join-Path $imgDir "$slug.tmp"
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $sorgenti[$slug] -Headers $headers -TimeoutSec 20 -OutFile $temp
        $bytes = [System.IO.File]::ReadAllBytes($temp)
        $ext = $null
        if ($bytes.Length -ge 12) {
            if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) { $ext = ".jpg" }
            elseif ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) { $ext = ".png" }
            elseif ($bytes[0] -eq 0x52 -and $bytes[1] -eq 0x49 -and $bytes[2] -eq 0x46 -and $bytes[3] -eq 0x46 -and
                    $bytes[8] -eq 0x57 -and $bytes[9] -eq 0x45 -and $bytes[10] -eq 0x42 -and $bytes[11] -eq 0x50) { $ext = ".webp" }
        }
        if ($ext) {
            Move-Item -Force $temp (Join-Path $imgDir "$slug$ext")
            Write-Host "  [OK] $slug$ext" -ForegroundColor Green
        } else {
            Remove-Item -Force $temp -ErrorAction SilentlyContinue
            Write-Host "  [BLOCCATA/NON VALIDA] $slug -> salvala a mano" -ForegroundColor Yellow
        }
    } catch {
        Remove-Item -Force $temp -ErrorAction SilentlyContinue
        Write-Host "  [ERRORE] $slug -> $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 2) Mappa tutte le immagini locali presenti
$validExt = @(".webp", ".jpg", ".jpeg", ".png")
$imgMap = @{}
Get-ChildItem -Path $imgDir -File | ForEach-Object {
    $ext = $_.Extension.ToLowerInvariant()
    if ($validExt -contains $ext) {
        $imgMap[$_.BaseName.ToLowerInvariant()] = $_.Name
    }
}

# 3) Aggiorna data/articoli.json
$jsonPath = Join-Path $root "data\articoli.json"
if (Test-Path $jsonPath) {
    $data = ([System.IO.File]::ReadAllText($jsonPath, $utf8NoBom)) | ConvertFrom-Json
    foreach ($art in $data.articles) {
        if ($art.url -match 'articoli/([^/]+)\.html$') {
            $slug = $Matches[1].ToLowerInvariant()
            if ($imgMap.ContainsKey($slug)) {
                $art.image = "/immagini/articoli/" + $imgMap[$slug]
            }
        }
    }
    [System.IO.File]::WriteAllText($jsonPath, ($data | ConvertTo-Json -Depth 10), $utf8NoBom)
}

# 4) Aggiorna articoli/*.html, index.html e scopri.html
$indexPath = Join-Path $root "index.html"
$scopriPath = Join-Path $root "scopri.html"
$indexHtml = if (Test-Path $indexPath) { [System.IO.File]::ReadAllText($indexPath, $utf8NoBom) } else { "" }
$scopriHtml = if (Test-Path $scopriPath) { [System.IO.File]::ReadAllText($scopriPath, $utf8NoBom) } else { "" }

foreach ($slug in $imgMap.Keys) {
    $fileName = $imgMap[$slug]
    $relArtPath = "../immagini/articoli/$fileName"
    $relRootPath = "immagini/articoli/$fileName"
    $ogUrl = "https://newsgaming2.it/immagini/articoli/$fileName"

    $artFile = Join-Path $root "articoli\$slug.html"
    if (Test-Path $artFile) {
        $html = [System.IO.File]::ReadAllText($artFile, $utf8NoBom)
        if ($html -match 'class="[^"]*\barticle-cover\b') {
            $html = [regex]::Replace($html, '<img\b[^>]*\bclass="[^"]*\barticle-cover\b[^"]*"[^>]*>', {
                param($m)
                [regex]::Replace($m.Value, '\bsrc="[^"]*"', "src=""$relArtPath""")
            })
        } else {
            Write-Host "  [NOTA] articoli\$slug.html non ha il tag <img class='article-cover'> nella pagina" -ForegroundColor Magenta
        }
        $html = [regex]::Replace($html, '<meta\b[^>]*property="og:image"[^>]*>', {
            param($m)
            [regex]::Replace($m.Value, '\bcontent="[^"]*"', "content=""$ogUrl""")
        })
        $html = [regex]::Replace($html, '<meta\b[^>]*name="twitter:image"[^>]*>', {
            param($m)
            [regex]::Replace($m.Value, '\bcontent="[^"]*"', "content=""$ogUrl""")
        })
        [System.IO.File]::WriteAllText($artFile, $html, $utf8NoBom)
    }

    $cardPattern = '(<a\b[^>]*\bhref="articoli/' + [regex]::Escape($slug) + '\.html"[^>]*>\s*<img\b[^>]*>)'
    if ($indexHtml) {
        $indexHtml = [regex]::Replace($indexHtml, $cardPattern, {
            param($m)
            [regex]::Replace($m.Value, '\bsrc="[^"]*"', "src=""$relRootPath""")
        }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    }
    if ($scopriHtml) {
        $scopriHtml = [regex]::Replace($scopriHtml, $cardPattern, {
            param($m)
            [regex]::Replace($m.Value, '\bsrc="[^"]*"', "src=""$relRootPath""")
        }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    }
}

if ($indexHtml) { [System.IO.File]::WriteAllText($indexPath, $indexHtml, $utf8NoBom) }
if ($scopriHtml) { [System.IO.File]::WriteAllText($scopriPath, $scopriHtml, $utf8NoBom) }

Write-Host "`nFatto! Immagini collegate in locale: $($imgMap.Count)." -ForegroundColor Cyan