import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
document.querySelector('#recover-form').addEventListener('submit',async e=>{
 e.preventDefault();const msg=document.querySelector('#message');msg.textContent='Invio in corso…';
 const email=document.querySelector('#email').value.trim();
 const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/nuova-password.html'});
 msg.textContent=error?error.message:'Se l’indirizzo è registrato, riceverai un link per reimpostare la password.';
});
