import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const remember=localStorage.getItem('ng2-remember') !== '0';
const supabase=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:remember,autoRefreshToken:true,detectSessionInUrl:true,storage:remember?localStorage:sessionStorage}});
const rememberBox=document.querySelector('#remember'); if(rememberBox){rememberBox.checked=remember; rememberBox.addEventListener('change',()=>{localStorage.setItem('ng2-remember',rememberBox.checked?'1':'0'); location.reload();});}
const form=document.querySelector('#auth-form'), msg=document.querySelector('#message'), emailInput=document.querySelector('#email');
const savedEmail=localStorage.getItem('ng2-email'); if(savedEmail) emailInput.value=savedEmail;
const email=()=>emailInput.value.trim(); const password=()=>document.querySelector('#password').value;
document.querySelector('#signup').addEventListener('click',async()=>{
 if(!form.reportValidity()) return;
 const privacyNotice=document.querySelector('#privacyNotice');
 if(!privacyNotice?.checked){msg.textContent='Per creare l’account devi prima leggere e confermare la presa visione dell’Informativa sulla Privacy.';privacyNotice?.focus();return;}
 localStorage.setItem('ng2-email',email());
 msg.textContent='Creazione account in corso…';
 const {error}=await supabase.auth.signUp({email:email(),password:password(),options:{emailRedirectTo:location.origin+'/account.html',data:{display_name:(document.querySelector('#display-name')?.value||'').trim(),privacy_notice_version:'2026-11-13',privacy_notice_read_at:new Date().toISOString()}}});
 msg.textContent=error?error.message:'Registrazione inviata. Controlla la tua email e conferma l’indirizzo prima di accedere.';
});
form.addEventListener('submit',async e=>{
 e.preventDefault(); if(!form.reportValidity()) return; localStorage.setItem('ng2-email',email());
 msg.textContent='Accesso in corso…';
 const {error}=await supabase.auth.signInWithPassword({email:email(),password:password()});
 if(error){msg.textContent=error.message;return;}
 location.href='/area-personale.html';
});
