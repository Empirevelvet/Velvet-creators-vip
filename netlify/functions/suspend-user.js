// netlify/functions/suspend-user.js
import { getStore } from '@netlify/blobs';

const ok = (s, b) => ({ statusCode: s, headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) });

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return ok(405, { error: 'Méthode non autorisée' });
  try {
    const { id, email, reason } = JSON.parse(event.body || '{}');
    if (!id && !email) return ok(400, { error: 'id ou email requis' });

    const users = getStore('users');

    // on stocke par email normalisé -> si on reçoit id, on doit retrouver l’email
    // On essaie d’abord comme clé directe
    let key = (email || '').trim().toLowerCase();

    if (!key) {
      // fallback: parcourir pour retrouver l’email via l’id
      const { blobs } = await users.list();
      for (const b of blobs || []) {
        const raw = await users.get(b.key);
        if (!raw) continue;
        const u = JSON.parse(raw);
        if (u.id === id) { key = b.key; break; }
      }
    }

    if (!key) return ok(404, { error: 'Utilisateur introuvable' });

    const raw = await users.get(key);
    if (!raw) return ok(404, { error: 'Utilisateur introuvable' });
    const u = JSON.parse(raw);

    u.status = 'suspended';
    u.suspendReason = reason || '';
    u.updatedAt = new Date().toISOString();

    await users.set(key, JSON.stringify(u));
    return ok(200, { success: true });
  } catch (e) {
    return ok(500, { error: e.message });
  }
};
