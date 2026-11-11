
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  window.NG_SUPABASE_URL,
  window.NG_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const $ = id => document.getElementById(id);

function showMessage(message) {
  alert(message);
}

function updateLevel(xp) {
  const level = Math.floor((xp || 0) / 100) + 1;
  if ($('xp')) $('xp').textContent = xp || 0;
  if ($('level')) $('level').textContent = level;
}

async function loadProfile(user) {
  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  if ($('who')) {
    $('who').textContent =
      profile.display_name || profile.username || user.email;
  }

  if ($('displayName')) {
    $('displayName').value = profile.display_name || '';
  }

  if ($('username')) {
    $('username').value = profile.username || '';
  }

  if ($('bio')) {
    $('bio').value = profile.bio || '';
  }

  if ($('avatarUrl')) {
    $('avatarUrl').value = profile.avatar_url || '';
  }

  updateLevel(profile.xp);

  if ($('dailyStatus')) {
    const today = new Date().toISOString().slice(0, 10);
    const claimed = profile.last_login_date === today;

    $('dailyStatus').textContent = claimed
      ? 'Hai già riscosso gli XP di oggi!'
      : 'Puoi riscuotere i tuoi XP giornalieri.';
  }

  if ($('dailyClaim')) {
    const today = new Date().toISOString().slice(0, 10);
    const claimed = profile.last_login_date === today;

    $('dailyClaim').disabled = claimed;
    $('dailyClaim').textContent = claimed
      ? 'Già riscosso oggi'
      : 'Riscatta XP giornalieri';
  }

  if ($('dailyStreak')) {
    $('dailyStreak').textContent = profile.daily_streak || 0;
  }
}

async function saveProfile(user) {
  const button = $('profileForm')?.querySelector('[type="submit"]');

  const display_name = $('displayName')?.value.trim() || '';
  const username = $('username')?.value.trim() || '';
  const bio = $('bio')?.value.trim() || '';
  const avatar_url = $('avatarUrl')?.value.trim() || '';

  if (button) button.disabled = true;

  try {
    const { error } = await sb
      .from('profiles')
      .update({
        display_name,
        username,
        bio,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;

    await loadProfile(user);
    showMessage('Profilo aggiornato correttamente!');
  } catch (error) {
    showMessage('Errore nel salvataggio: ' + error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

async function claimDailyXP(user) {
  const button = $('dailyClaim');
  if (!button || button.disabled) return;

  button.disabled = true;

  try {
    const { data, error } = await sb.rpc('claim_daily_login');
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    await loadProfile(user);

    if (result?.xp_awarded > 0) {
      showMessage(`Hai ricevuto ${result.xp_awarded} XP!`);
    } else {
      showMessage('Hai già riscosso gli XP di oggi.');
    }
  } catch (error) {
    showMessage('Errore nel riscatto degli XP: ' + error.message);
    button.disabled = false;
  }
}

async function deleteAccount() {
  const confirmation = prompt(
    'ATTENZIONE: la cancellazione dell’account è definitiva. Scrivi ELIMINA per confermare.'
  );

  if (confirmation !== 'ELIMINA') return;

  const { data: { session }, error } = await sb.auth.getSession();

  if (error || !session) {
    showMessage('Sessione non disponibile. Accedi nuovamente.');
    return;
  }

  try {
    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Cancellazione non riuscita.');
    }

    await sb.auth.signOut();
    window.location.href = '/index.html';
  } catch (error) {
    showMessage('Errore: ' + error.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: { session }, error } = await sb.auth.getSession();

    if (error || !session) {
      window.location.href = '/account.html';
      return;
    }

    const user = session.user;

    await loadProfile(user);

    $('profileForm')?.addEventListener('submit', event => {
      event.preventDefault();
      saveProfile(user);
    });

    $('dailyClaim')?.addEventListener('click', () => {
      claimDailyXP(user);
    });

    $('logout')?.addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = '/account.html';
    });

    $('delete')?.addEventListener('click', deleteAccount);

  } catch (error) {
    console.error('Errore Area personale:', error);

    if ($('who')) $('who').textContent = 'Errore nel caricamento del profilo';
    if ($('dailyStatus')) $('dailyStatus').textContent = error.message;
  }
});
