// netlify/functions/update-activity.js
// Marque un utilisateur comme actif maintenant (POST {email})
module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'POST uniquement' }) };
  }
  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email manquant' }) };

    const { getStore } = await import('@netlify/blobs');
    const users = getStore('users');
    const key = String(email).trim().toLowerCase();
    const raw = await users.get(key);
    if (!raw) return { statusCode: 404, body: JSON.stringify({ error: 'compte introuvable' }) };

    const u = JSON.parse(raw);
    const now = new Date().toISOString();
    u.lastActive = now; u.updatedAt = now;
    await users.set(key, JSON.stringify(u));

    return { statusCode: 200, body: JSON.stringify({ success:true, lastActive: now }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ success:false, error: e.message }) };
  }
};
