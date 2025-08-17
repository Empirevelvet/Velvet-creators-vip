VELVET — Admin Dashboard (Noir & Or) + Purge 90j + Auto-refresh 30s
====================================================================

Contenu du ZIP :
- admin-dashboard.html  → Remplace ton fichier (design VIP + auto-refresh 30s + purge bouton)
- netlify/functions/prune-users.js   → Fonction Netlify pour supprimer comptes inactifs (90 jours)
- netlify/functions/update-activity.js → Marquer un compte "actif" après login (facultatif)
- NETLIFY_SCHEDULE_SNIPPET.txt → Bloc à copier-coller dans ton netlify.toml

Étapes :
1) Dépose `admin-dashboard.html` à la racine de ton site (remplacement).
2) Crée le dossier `netlify/functions/` si besoin et ajoute les deux fichiers `.js`.
3) Ouvre ton `netlify.toml` et AJOUTE le bloc du fichier NETLIFY_SCHEDULE_SNIPPET.txt (ne supprime rien).
4) Publie. Le Dashboard se rafraîchit tout seul toutes les 30 secondes. Le bouton "Purger inactifs (90 j)" lance la purge à la demande.

Endpoints utilisés par le Dashboard :
- GET  /api/list-users        → { users: [ {id, email, username, role, status, createdAt} ] }
- POST /api/update-user       → { id, status? ('active'|'suspended'), delete? true, reason? }
- GET  /api/list-ledger       → { items: [ {id, date, creatorName, creatorId, type, amount, txn, clientEmail, paid} ] }
- POST /api/mark-paid         → { saleId } ou { creatorName } / { creatorId }
- GET  /api/list-conversations (optionnel)
- GET  /api/list-lives        (optionnel)
- GET  /api/prune-users       → lancé par le bouton et via cron

Notes :
- Si vos fonctions existantes renvoient des clés différentes, adaptez légèrement dans le JS (section CONFIG ENDPOINTS + mapping dans loadLedger/loadUsers).
- Le style est 100% encapsulé dans admin-dashboard.html, il NE touche PAS les autres pages du site.
