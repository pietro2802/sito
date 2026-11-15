import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(window.NG_SUPABASE_URL, window.NG_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));
const safeHttpUrl = value => {
  try {
    const url = new URL(String(value || ''), location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};
const today = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

// Copertine specifiche del gioco: Steam CDN o artwork ufficiale del publisher.
// Non viene mai usata un'immagine generica al posto della copertina.
const upcoming = [
  {
    slug: 'gta-6',
    title: 'Grand Theft Auto VI',
    release_date: '2026-11-19',
    genre: 'Azione / Open world',
    platforms: ['PS5', 'Xbox Series X|S'],
    description: 'Il nuovo capitolo della serie è previsto per il 19 novembre 2026.',
    cover_url: 'https://www.rockstargames.com/VI/_next/static/media/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg?akim=1&imdensity=1&imwidth=1200',
    official_url: 'https://www.rockstargames.com/VI'
  },
  {
    slug: 'binding-of-isaac-repentance-plus',
    title: 'The Binding of Isaac: Repentance+',
    release_date: '2026-11-19',
    genre: 'Roguelike',
    platforms: ['Nintendo Switch 2'],
    description: 'Edizione ampliata in arrivo su Nintendo Switch 2.',
    cover_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/header.jpg',
    official_url: 'https://store.steampowered.com/app/250900/'
  },
  {
    slug: 'hela-of-mice-and-magic',
    title: 'Hela: of Mice & Magic',
    release_date: '2026-12-01',
    genre: 'Avventura / Esplorazione',
    platforms: ['PC', 'PS5', 'Xbox Series X|S', 'Nintendo Switch 2'],
    description: 'Avventura cooperativa ambientata in paesaggi ispirati alla Scandinavia.',
    cover_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3161310/header.jpg',
    official_url: 'https://store.steampowered.com/app/3161310/'
  },
  {
    slug: 'dragon-quest-monsters-withered-world',
    title: 'DRAGON QUEST MONSTERS: Il regno sfiorito',
    release_date: '2026-12-03',
    genre: 'GDR / Collezione di creature',
    platforms: ['PC', 'PS5', 'Xbox Series X|S', 'Nintendo Switch', 'Nintendo Switch 2'],
    description: 'Nuovo capitolo della serie Dragon Quest Monsters, in arrivo il 3 dicembre.',
    cover_url: 'https://cdn11.bigcommerce.com/s-6kgfzq4siu/images/stencil/1280x1280/products/3572/17981/DQMTWW_SQEX_SEE_500x718_NoRating_v03__51970.1781005848.jpg?c=1',
    official_url: 'https://store.steampowered.com/app/3681610/'
  },

  {
    slug: 'warhammer-40000-dawn-of-war-iv',
    title: 'Warhammer 40,000: Dawn of War IV',
    release_date: '2026-12-03',
    genre: 'Strategia / RTS',
    platforms: ['PC'],
    description: 'Nuovo capitolo strategico ambientato nell’universo di Warhammer 40,000.',
    cover_url: 'https://images.everyeye.it/img-articoli/dawn-of-war-iv-strategia-personalizzazione-battaglie-epiche-mondo-warhammer-40k-v10-65994.jpg',
    official_url: 'https://store.steampowered.com/app/2272360/'
  },
  {
    slug: 'edge-of-memories',
    title: 'Edge of Memories',
    release_date: '2026-12-03',
    genre: 'GDR / Azione',
    platforms: ['PC', 'PS5', 'Xbox Series X|S'],
    description: 'GDR d’azione ambientato nel mondo di Avaris. La data è stata aggiornata dagli sviluppatori al 3 dicembre.',
    cover_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2738170/header.jpg',
    official_url: 'https://store.steampowered.com/app/2738170/'
  },
  {
    slug: 'monster-hunter-wilds-switch2',
    title: 'Monster Hunter Wilds – Nintendo Switch 2 Edition',
    release_date: '2026-12-04',
    genre: 'Azione / Avventura',
    platforms: ['Nintendo Switch 2'],
    description: 'Versione per Nintendo Switch 2 prevista per il 4 dicembre.',
    cover_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2246340/header.jpg',
    official_url: 'https://www.monsterhunter.com/wilds/'
  },
  {
    slug: 'attack-on-titan-3',
    title: 'Attack on Titan 3',
    release_date: '2026-12-10',
    genre: 'Azione / Avventura',
    platforms: ['PC', 'PS5', 'Xbox Series X|S', 'Nintendo Switch 2'],
    description: 'Nuovo capitolo videoludico ispirato alla serie.',
    cover_url: 'https://item-yoyaku.bookoff.co.jp/img/item/pkg_img/4988615217708.jpg',
    official_url: 'https://store.steampowered.com/app/2916700/'
  },
  {
    slug: 'layton-new-world-steam',
    title: 'Professor Layton and the New World of Steam',
    release_date: '2026-12-10',
    genre: 'Avventura / Puzzle',
    platforms: ['PC', 'PS5', 'Nintendo Switch', 'Nintendo Switch 2'],
    description: 'Nuova avventura investigativa con il Professor Layton e Luke.',
    cover_url: 'https://d1lss44hh2trtw.cloudfront.net/assets/article/2023/11/29/nintendoswitch-professor-layton-and-the-new-world-of-steam-keyart-horizontal_feature.jpg',
    official_url: 'https://store.steampowered.com/app/3384600/'
  }
];

// Voci che erano state inserite con una data futura errata o che sono già uscite.
// Non vengono mostrate nel calendario delle prossime uscite.
const alreadyReleasedSlugs = new Set([
  'forza-horizon-6',
  'metaphor-refantazio-switch2',
  'pikmin-4-switch2',
  'sonic-pico-park'
]);

function mergeGames(databaseGames = []) {
  const games = new Map();

  for (const game of databaseGames) {
    const slug = game.slug || String(game.title || '').toLowerCase();
    if (alreadyReleasedSlugs.has(slug)) continue;
    if (!game.release_date || game.release_date < today()) continue;
    games.set(slug, { ...game });
  }

  for (const game of upcoming) {
    games.set(game.slug, { ...games.get(game.slug), ...game });
  }

  return [...games.values()].sort((a, b) =>
    String(a.release_date).localeCompare(String(b.release_date)) ||
    String(a.title).localeCompare(String(b.title), 'it')
  );
}

async function boot() {
  const box = $('#games');
  const note = $('#gameDbNote');
  const search = $('#gameSearch');
  let games = mergeGames();

  try {
    const { data, error } = await sb.from('games').select('*').order('release_date', { ascending: true });
    if (error) throw error;
    games = mergeGames(data || []);
    note.textContent = 'Calendario delle uscite future aggiornato. I giochi già usciti sono esclusi.';
  } catch (error) {
    games = mergeGames(upcoming);
    note.textContent = 'Calendario redazionale delle prossime uscite. Il collegamento al database non è al momento disponibile.';
    console.warn('Calendario Supabase non disponibile; mostro le uscite verificate.', error);
  }

  render(games);
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('it');
    render(games.filter(game => [
      game.title, game.genre, (game.platforms || []).join(' '), game.description
    ].join(' ').toLocaleLowerCase('it').includes(query)));
  });
}

function render(games) {
  const box = $('#games');
  if (!box) return;

  box.innerHTML = games.length ? games.map(game => {
    const date = new Date(game.release_date + 'T00:00:00')
      .toLocaleDateString('it-IT', { dateStyle: 'long' });
    const platforms = (game.platforms || [])
      .map(platform => `<span class="ng-pill">${esc(platform)}</span>`).join('');
    const cover = safeHttpUrl(game.cover_url);
    const official = safeHttpUrl(game.official_url);

    return `<article class="ng-game-card">
      <div class="ng-game-art">
        ${cover
          ? `<img src="${esc(cover)}" alt="Copertina di ${esc(game.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false">`
          : ''}
        <div class="ng-game-no-cover" ${cover ? 'hidden' : ''}>Copertina non disponibile</div>
      </div>
      <div>
        <div class="ng-game-date">In uscita · ${esc(date)}</div>
        <h3>${esc(game.title)}</h3>
        <p class="muted">${esc(game.description || '')}</p>
        <div class="ng-meta"><span>${esc(game.genre || 'Genere non indicato')}</span>${platforms}</div>
        ${official ? `<p><a class="ng-source" href="${esc(official)}" target="_blank" rel="noopener noreferrer">Scheda del gioco →</a></p>` : ''}
      </div>
    </article>`;
  }).join('') : '<div class="ng-empty">Non ci sono uscite future nel calendario.</div>';
}

boot();
