import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s); const esc=v=>(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const {data:{session}}=await sb.auth.getSession();
if(!session) location.replace('/account.html');
else{
 const id=session.user.id;
 const [{data:p},{data:f},{data:b},{data:n}]=await Promise.all([
  sb.from('profiles').select('*').eq('id',id).maybeSingle(),sb.from('favorites').select('article_slug,created_at').eq('user_id',id).order('created_at',{ascending:false}),
  sb.from('user_badges').select('earned_at,badges(name,description,icon)').eq('user_id',id),sb.from('notifications').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(10)
 ]);
 $('#who').textContent='Account: '+session.user.email;
 $('#displayName').value=p?.display_name||'';$('#username').value=p?.username||'';$('#bio').value=p?.bio||'';$('#avatarUrl').value=p?.avatar_url||'';
 const refreshStats=xp=>{$('#xp').textContent=xp||0;$('#level').textContent=Math.floor(Number(xp||0)/100)+1;};refreshStats(p?.xp);
 $('#dailyStatus').textContent=`Streak attuale: ${p?.daily_streak||0} giorni · ${nextRewardText(p?.daily_streak||0)}`;
 $('#favorites').innerHTML=(f||[]).map(x=>`<li><a href="/articoli/${encodeURIComponent(x.article_slug)}.html">${esc(x.article_slug)}</a></li>`).join('')||'<li>Nessun preferito.</li>';
 $('#badges').innerHTML=(b||[]).map(x=>`<li>${esc(x.badges?.icon||'🏆')} <b>${esc(x.badges?.name||'Badge')}</b><br><span class="muted">${esc(x.badges?.description||'')}</span></li>`).join('')||'<li>Nessun badge ancora.</li>';
 $('#notifications').innerHTML=(n||[]).map(x=>`<li><b>${esc(x.title)}</b><br><span class="muted">${esc(x.body)}</span></li>`).join('')||'<li>Nessuna notifica.</li>';
 $('#profileForm').addEventListener('submit',async e=>{e.preventDefault();const {error}=await sb.from('profiles').update({display_name:$('#displayName').value.trim(),username:$('#username').value.trim()||null,bio:$('#bio').value.trim(),avatar_url:$('#avatarUrl').value.trim()||null}).eq('id',id);$('#message').textContent=error?'Errore: '+error.message:'Profilo aggiornato.';});
 function nextRewardText(streak){const d=Number(streak||0)+1; if(d===7)return 'domani: bonus +50 XP'; if(d===14)return 'domani: bonus +100 XP'; if(d===30)return 'domani: bonus +250 XP'; return 'continua la serie per aumentare il premio';}
$('#dailyClaim').onclick=async()=>{const b=$('#dailyClaim');b.disabled=true;const {data,error}=await sb.rpc('claim_daily_login');const row=data?.[0];if(error)$('#dailyStatus').textContent='Errore: '+error.message;else if(!row||Number(row.xp_awarded)===0)$('#dailyStatus').textContent=`XP già riscattati oggi · streak ${row?.streak||p?.daily_streak||0} giorni. Torna domani!`;else{refreshStats(row.total_xp);$('#dailyStatus').textContent=`+${row.xp_awarded} XP · streak ${row.streak} giorni · totale ${row.total_xp} XP · ${nextRewardText(row.streak)}`;};b.disabled=false;};
 $('#logout').onclick=async()=>{await sb.auth.signOut();location.href='/account.html'};
 $('#delete').onclick=async()=>{if(!confirm('Vuoi davvero richiedere la cancellazione definitiva del tuo account?'))return;$('#message').textContent='Richiesta in corso…';const r=await fetch('/.netlify/functions/delete-account',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}});const out=await r.json().catch(()=>({}));if(!r.ok){$('#message').textContent=out.error||'Impossibile completare la richiesta.';return}await sb.auth.signOut();location.href='/'};
}
