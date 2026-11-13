import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const slug=location.pathname.split('/').pop().replace(/\.html$/,'');const $=s=>document.querySelector(s);
const esc=v=>(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function load(){
 const {data:{session}}=await sb.auth.getSession();
 $('#ngArticleCommentsLogin').innerHTML=session?'Connesso: <b>'+esc(session.user.email)+'</b>':'<a href="/account.html">Accedi</a> per commentare';
 if(session)$('#ngArticleCommentForm').addEventListener('submit',async e=>{e.preventDefault();const body=$('#ngArticleCommentBody').value.trim();if(!body)return;const {error}=await sb.from('comments').insert({article_slug:slug,user_id:session.user.id,body});$('#ngArticleCommentMsg').textContent=error?'Errore: '+error.message:'Commento pubblicato.';if(!error){$('#ngArticleCommentBody').value='';render()}});
 render();
}
async function render(){
 const {data,error}=await sb.from('comments').select('id,user_id,body,created_at,profiles(display_name,username,xp)').eq('article_slug',slug).eq('status','published').order('created_at',{ascending:false});
 if(error){$('#ngArticleCommentsList').innerHTML='<div class="ng-alert error">'+esc(error.message)+'</div>';return}
 $('#ngArticleCommentsList').innerHTML=(data||[]).map(c=>`<article class="ng-comment"><div class="ng-comment-meta"><b>${esc(c.profiles?.display_name||c.profiles?.username||'Player')}</b><span>LV ${Math.floor((c.profiles?.xp||0)/100)+1}</span><span>· ${new Date(c.created_at).toLocaleString('it-IT',{dateStyle:'medium',timeStyle:'short'})}</span></div><div class="ng-comment-body">${esc(c.body)}</div></article>`).join('')||'<div class="ng-empty">Nessun commento ancora.</div>';
}
load();
