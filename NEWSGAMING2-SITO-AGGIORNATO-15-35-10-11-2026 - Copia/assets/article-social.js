import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const slug=location.pathname.split('/').pop().replace(/\.html$/,'');
const box=document.querySelector('#ngArticleSocial');
if(!box)return;
const {data:{session}}=await sb.auth.getSession();
let saved=false;
if(session){const {data}=await sb.from('favorites').select('article_slug').eq('user_id',session.user.id).eq('article_slug',slug).maybeSingle();saved=!!data}
box.innerHTML=`<div class="ng-toolbar"><button id="fav" class="ng-btn ${saved?'secondary':''}">${saved?'★ Nei preferiti':'☆ Salva tra i preferiti'}</button><a class="ng-btn secondary" href="/community.html?article=${encodeURIComponent(slug)}">💬 Discussione</a></div><p id="favmsg" class="muted"></p>`;
document.querySelector('#fav').onclick=async()=>{
 if(!session){location.href='/account.html';return}
 if(saved){const {error}=await sb.from('favorites').delete().eq('user_id',session.user.id).eq('article_slug',slug);if(error){document.querySelector('#favmsg').textContent=error.message;return}saved=false}
 else {const {error}=await sb.from('favorites').insert({user_id:session.user.id,article_slug:slug});if(error){document.querySelector('#favmsg').textContent=error.message;return}saved=true}
 document.querySelector('#fav').textContent=saved?'★ Nei preferiti':'☆ Salva tra i preferiti';
};
