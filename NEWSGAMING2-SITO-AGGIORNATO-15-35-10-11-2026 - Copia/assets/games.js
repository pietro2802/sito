import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
const esc=v=>(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fallback=[
 {slug:'gta-6',title:'Grand Theft Auto VI',release_date:'2026-11-19',genre:'Azione / Open world',platforms:['PS5','Xbox Series X|S'],description:'Lancio ufficiale indicato da PlayStation per il 19 novembre 2026.',official_url:'https://www.playstation.com/it-it/ps5/games/'},
 {slug:'until-dawn-2',title:'Until Dawn 2',release_date:'2027-01-28',genre:'Horror / Avventura',platforms:['PS5'],description:'Nuovo capitolo annunciato da PlayStation; data indicata: 28 gennaio 2027.',official_url:'https://www.playstation.com/it-it/ps5/games/'},
 {slug:'forza-horizon-6',title:'Forza Horizon 6',release_date:'2027-01-26',genre:'Corse',platforms:['Xbox Series X|S','PC','PS5'],description:'Nuovo capitolo della serie Forza Horizon, con uscita indicata da PlayStation per il 26 gennaio 2027.',official_url:'https://www.playstation.com/it-it/ps5/games/'},
 {slug:'god-of-war-laufey',title:'God of War: Laufey',release_date:'2027-02-16',genre:'Azione / Avventura',platforms:['PS5'],description:'Nuovo capitolo di God of War con data indicata da PlayStation: 16 febbraio 2027.',official_url:'https://www.playstation.com/it-it/ps5/games/'},
 {slug:'metaphor-refantazio-switch2',title:'Metaphor: ReFantazio',release_date:'2026-11-12',genre:'RPG',platforms:['Nintendo Switch 2'],description:'Versione Nintendo Switch 2 in uscita il 12 novembre 2026.',official_url:'https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html'},
 {slug:'pikmin-4-switch2',title:'Pikmin 4 – Nintendo Switch 2 Edition + Accademia Dandori',release_date:'2026-11-12',genre:'Strategia / Avventura',platforms:['Nintendo Switch 2'],description:'Versione migliorata indicata da Nintendo per il 12 novembre 2026.',official_url:'https://www.nintendo.com/it-it/Notizie/2026/Novembre/Giochi-in-arrivo-Novembre-2026-3229019.html'},
 {slug:'binding-of-isaac-repentance-plus',title:'The Binding of Isaac: Repentance+',release_date:'2026-11-19',genre:'Roguelike',platforms:['Nintendo Switch 2'],description:'Uscita indicata da Nintendo per il 19 novembre 2026.',official_url:'https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html'},
 {slug:'rayman-legends-retold',title:'Rayman Legends Retold',release_date:'2026-12-03',genre:'Platform',platforms:['Nintendo Switch 2'],description:'Rivisitazione con nuovi contenuti indicata da Nintendo per il 3 dicembre 2026.',official_url:'https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html'},
 {slug:'layton-new-world-steam',title:'Il professor Layton e il Nuovo Mondo a vapore',release_date:'2026-12-10',genre:'Avventura / Puzzle',platforms:['Nintendo Switch'],description:'Nuovo capitolo della serie Layton, indicato da Nintendo per il 10 dicembre 2026.',official_url:'https://www.nintendo.com/it-it/Giochi/Scopri-i-giochi/Giochi-in-arrivo/Prossimi-giochi-622129.html'}
];
async function boot(){
 const box=$('#games');
 const {data,error}=await sb.from('games').select('*').order('release_date',{ascending:true});
 if(error){
   if(/could not find the table|relation .*games.*does not exist/i.test(error.message||'')){
     render(fallback); $('#gameDbNote').textContent='Anteprima locale verificata. Per collegare definitivamente il calendario a Supabase, esegui supabase-schema.sql.'; return;
   }
   box.innerHTML='<div class="ng-alert error">Impossibile caricare il calendario: '+esc(error.message)+'</div>'; return;
 }
 render(data||[]);
 $('#gameSearch').addEventListener('input',filter);
 function filter(e){const q=e.target.value.toLowerCase();render((data||[]).filter(g=>(g.title+' '+(g.genre||'')+' '+(g.platforms||[]).join(' ')).toLowerCase().includes(q)));}
}
function render(games){
 const box=$('#games');
 box.innerHTML=games.length?games.map(g=>{
  const date=g.release_date?new Date(g.release_date+'T00:00:00').toLocaleDateString('it-IT',{dateStyle:'long'}):'Data da confermare';
  const platforms=(g.platforms||[]).map(x=>`<span class="ng-pill">${esc(x)}</span>`).join('');
  return `<article class="ng-game-card"><div class="ng-game-art"><img src="${esc(g.cover_url||'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80')}" alt="" loading="lazy"></div><div><div class="ng-game-date">${esc(date)}</div><h3>${esc(g.title)}</h3><p class="muted">${esc(g.description||'')}</p><div class="ng-meta"><span>${esc(g.genre||'Genere non indicato')}</span>${platforms}</div>${g.official_url?`<p><a class="ng-source" href="${esc(g.official_url)}" target="_blank" rel="noopener noreferrer">Fonte ufficiale →</a></p>`:''}</div></article>`;
 }).join(''):'<div class="ng-empty">Nessun gioco trovato.</div>';
}
boot();
