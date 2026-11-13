import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient(window.NG_SUPABASE_URL,window.NG_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
export async function claimDailyLogin(){return sb.rpc('claim_daily_login');}
export async function getLeaderboard(limit=20){return sb.from('leaderboard').select('id,display_name,username,avatar_url,xp,daily_streak,level,progress').order('xp',{ascending:false}).limit(limit);}
export function levelFromXp(xp=0){return Math.floor(Number(xp)/100)+1;}
export function levelProgress(xp=0){return Number(xp)%100;}
export function rewardForNextDay(streak=0){const d=Number(streak)+1; if(d===7)return 100; if(d===14)return 100; if(d===30)return 250; return Math.min(10+(d-1)*5,40);}
