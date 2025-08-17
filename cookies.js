// cookies.js — bandeau non bloquant, mobile-friendly
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  // Déjà accepté ?
  if (localStorage.getItem('cookieConsent') === 'yes') {
    try { banner.remove(); } catch {}
    return;
  }

  // Affiche le bandeau et réserve l’espace en bas pour ne rien masquer
  banner.hidden = false;
  document.body.classList.add('cookie-open');

  // Bouton "Accepter"
  const btn = document.getElementById('cookie-accept');
  if (btn) {
    btn.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'yes');
      try { banner.remove(); } catch {}
      document.body.classList.remove('cookie-open');
    });
  }
});
