document.getElementById('ngNewsletterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const msg = document.getElementById('ngNewsletterMsg');
  const button = form.querySelector('button[type="submit"]');

  msg.textContent = 'Invio in corso...';
  button.disabled = true;

  try {
    const response = await fetch('/api/newsletter-subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: document.getElementById('ngNewsletterEmail').value,
        website: document.getElementById('ngNewsletterWebsite').value,
        consent: document.getElementById('ngNewsletterConsent').checked
      })
    });

    const data = await response.json();

    msg.textContent = data.message || data.error ||
      'Si è verificato un errore.';

    if (response.ok) {
      form.reset();
    }
  } catch (error) {
    msg.textContent = 'Connessione non riuscita. Riprova.';
  } finally {
    button.disabled = false;
  }
});
