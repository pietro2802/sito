// profile.js - Gestione Area Personale e XP/Streak per NEWSGAMING2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  window.NG_SUPABASE_URL,
  window.NG_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session }, error: sessionError } = await sb.auth.getSession();
  if (sessionError || !session) {
    window.location.href = '/account.html';
    return;
  }

  const user = session.user;
  loadUserProfile(user);
  setupEventListeners(user);
});

async function loadUserProfile(user) {
  try {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    if (document.getElementById('usernameDisplay')) document.getElementById('usernameDisplay').textContent = profile.username || user.email;
    if (document.getElementById('displayNameInput')) document.getElementById('displayNameInput').value = profile.display_name || '';
    if (document.getElementById('bioInput')) document.getElementById('bioInput').value = profile.bio || '';
    if (document.getElementById('xpDisplay')) document.getElementById('xpDisplay').textContent = profile.xp || 0;
    if (document.getElementById('streakDisplay')) document.getElementById('streakDisplay').textContent = profile.daily_streak || 0;
    
    // Calcolo livello
    const currentXp = profile.xp || 0;
    const level = Math.floor(currentXp / 100) + 1;
    if (document.getElementById('levelDisplay')) document.getElementById('levelDisplay').textContent = level;

    // Controllo riscatto giornaliero
    checkDailyClaimStatus(profile.last_login_date);
  } catch (err) {
    console.error('Errore caricamento profilo:', err);
  }
}

function checkDailyClaimStatus(lastLoginDate) {
  const claimBtn = document.getElementById('claimDailyBtn');
  if (!claimBtn) return;

  const today = new Date().toISOString().split('T')[0];
  if (lastLoginDate === today) {
    claimBtn.textContent = 'Già riscosso oggi';
    claimBtn.disabled = true;
    claimBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    claimBtn.textContent = 'Riscatta XP Giornalieri';
    claimBtn.disabled = false;
    claimBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

function setupEventListeners(user) {
  // Salvataggio profilo
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const display_name = document.getElementById('displayNameInput').value;
      const bio = document.getElementById('bioInput').value;

      const { error } = await sb
        .from('profiles')
        .update({ display_name, bio, updated_at: new Date() })
        .eq('id', user.id);

      if (error) {
        alert('Errore durante il salvataggio: ' + error.message);
      } else {
        alert('Profilo aggiornato con successo!');
      }
    });
  }

  // Riscatto XP Giornalieri
  const claimBtn = document.getElementById('claimDailyBtn');
  if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
      claimBtn.disabled = true;
      try {
        const { data, error } = await sb.rpc('claim_daily_login');
        if (error) throw error;
        
        alert('XP giornalieri riscossi con successo!');
        loadUserProfile(user);
      } catch (err) {
        alert('Errore riscatto XP: ' + (err.message || 'Impossibile completare l\'operazione'));
        claimBtn.disabled = false;
      }
    });
  }

  // Cancellazione account
  const deleteBtn = document.getElementById('deleteAccountBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmText = prompt('ATTENZIONE: Questa azione è irreversibile.\nDigita "ELIMINA" per confermare la cancellazione definitiva del tuo account:');
      if (confirmText !== 'ELIMINA') {
        alert('Cancellazione annullata.');
        return;
      }

      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) throw new Error('Sessione non trovata.');

        const res = await fetch('/api/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Errore durante la cancellazione.');

        alert('Account eliminato con successo.');
        await sb.auth.signOut();
        window.location.href = '/index.html';
      } catch (err) {
        alert('Errore: ' + err.message);
      }
    });
  }
}
