<script>
// Utilitaire: lit l'email stocké après le login
function currentEmail(){
  try { return (localStorage.getItem('email') || '').trim().toLowerCase(); }
  catch { return ''; }
}

// Vérifie le statut VIP côté serveur (Netlify Function)
async function ensureVipOrRedirect() {
  const email = currentEmail();
  const r = await fetch('/.netlify/functions/vip-status', {
    headers: { 'X-User-Email': email }
  });
  const j = await r.json();
  if (!j.active) {
    // pas VIP -> renvoie vers la page VIP (avec info de retour)
    const here = encodeURIComponent(location.pathname + location.search);
    location.href = `/vip.html?need=1&next=${here}`;
  }
  // sinon rien à faire (il reste sur la page)
}

// Option: expose aussi une fonction qui retourne le statut VIP (utile pour afficher une pastille)
async function getVipStatus() {
  const email = currentEmail();
  const r = await fetch('/.netlify/functions/vip-status', {
    headers: { 'X-User-Email': email }
  });
  return r.json(); // { active:bool, expiresAt?:string }
}
</script>
