import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
document.querySelector('#reset-form').addEventListener('submit',async e=>{
 e.preventDefault();const msg=document.querySelector('#message');const password=document.querySelector('#password').value;
 if(password.length<8){msg.textContent='La password deve contenere almeno 8 caratteri.';return;}
 const {error}=await supabase.auth.updateUser({password});
 msg.textContent=error?error.message:'Password aggiornata. Ora puoi accedere.';if(!error)setTimeout(()=>location.href='/account.html',1800);
});
