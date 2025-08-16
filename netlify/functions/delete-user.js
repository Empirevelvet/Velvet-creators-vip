// netlify/functions/delete-user.js
import { getStore } from '@netlify/blobs';
const ok = (s, b) => ({ statusCode: s, headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) });

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return ok(405, { error: 'Méthode non autorisée' });
  try {
    const { id, email } = JSON.parse(event.body || '{}');
    if (!id && !email) return ok(400, { error: 'id ou email requis' });

    const users = getStore('users');
    const byUsername = getStore('by_username');

    let key = (email || '').trim().toLowerCase();
    let userDoc = null;

    if (key) {
      const raw = await users.get(key);
      if (raw) userDoc = JSON.parse(raw);
    } else {
      const { blobs } = await users.list();
      for (const b of blobs || []) {
        const raw = await users.get(b.key);
        if (!raw) continue;
        const u = JSON.parse(raw);
        if (u.id === id) { key = b.key; userDoc = u; break; }
      }
    }
    if (!key || !userDoc) return ok(404, { error: 'Utilisateur introuvable' });

    // supprimer index pseudo
    const uname = (userDoc.usernameLower || '').trim();
    if (uname) await byUsername.delete(uname);

    // supprimer la fiche utilisateur
    await users.delete(key);

    return ok(200, { success: true });
  } catch (e) {
    return ok(500, { error: e.message });
  }
};
