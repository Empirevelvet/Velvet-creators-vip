// netlify/functions/prune-users.js
// Purge comptes inactifs (>= 90 jours) depuis le store "users"
module.exports.handler = async () => {
  try {
    const { getStore } = await import('@netlify/blobs');
    const users = getStore('users');
    const byUsername = getStore('by_username');

    const list = await users.list();
    const now = Date.now();
    const DAYS_90 = 90 * 24 * 60 * 60 * 1000;

    let checked = 0, deleted = 0, kept = 0, details = [];

    for (const b of (list.blobs || [])) {
      checked++;
      const raw = await users.get(b.key);
      if (!raw) { kept++; continue; }
      let u;
      try { u = JSON.parse(raw); } catch { kept++; continue; }
      const ts = u.lastActive || u.updatedAt || u.createdAt;
      const t = ts ? new Date(ts).getTime() : 0;
      const inactive = !t || (now - t) > DAYS_90;
      if (inactive) {
        await users.delete(b.key);
        if (u.usernameLower) {
          const uKey = String(u.usernameLower).trim().toLowerCase();
          const emailInIndex = await byUsername.get(uKey);
          if (emailInIndex && emailInIndex === b.key) {
            await byUsername.delete(uKey);
          }
        }
        deleted++;
        details.push({ email: b.key, username: u.username, lastActive: ts || null });
      } else {
        kept++;
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, checked, deleted, kept, details })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
