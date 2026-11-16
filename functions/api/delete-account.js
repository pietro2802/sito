import {cfg,json} from "../_shared.js";
export async function onRequest({request,env}){
 if(request.method!=="POST")return json({error:"Metodo non consentito."},405);
 const c=cfg(env),auth=request.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return json({error:"Token di autorizzazione mancante."},401);
 if(!c.url||!c.key)return json({error:"Configurazione server incompleta."},500);
 try{
  const token=auth.slice(7),check=await fetch(c.url+"/auth/v1/user",{headers:{apikey:c.key,Authorization:"Bearer "+token}});
  if(!check.ok)return json({error:"Utente non autenticato o token non valido."},401);
  const user=await check.json();if(!user.id)return json({error:"Utente non autenticato."},401);
  const removed=await fetch(c.url+"/auth/v1/admin/users/"+encodeURIComponent(user.id),{method:"DELETE",headers:{apikey:c.key,Authorization:"Bearer "+c.key}});
  if(!removed.ok)return json({error:"Non è stato possibile eliminare l'account."},500);
  return json({success:true,message:"Account eliminato con successo."});
 }catch(e){console.error("delete-account",e.message);return json({error:"Errore interno del server."},500)}
}