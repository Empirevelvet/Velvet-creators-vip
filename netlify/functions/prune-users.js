// netlify/functions/prune-users.js
// Supprime les comptes sans activité depuis 90 jours
import { getStore } from "@netlify/blobs";

const DAYS_90_MS = 90 * 24 * 60 * 60 * 1000;

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async () => {
  try {
    const users = getStore("users");        // fiches utilisateurs (clé = email normalisé)
    const byUsername = getStore("by_username"); // index "pseudo" -> email

    // Récup liste des clés
    const list = await users.list();        // { blobs: [{key,size,metadata?}, ...] }

    const now = Date.now();
    let checked = 0, deleted = 0, kept = 0, details = [];

    for (const b of (list.blobs || [])) {
      checked++;
      const raw = await users.get(b.key);
      if (!raw) { kept++; continue; }

      let u;
      try { u = JSON.parse(raw); } catch { kept++; continue; }

      // On prend lastActive, sinon updatedAt, sinon createdAt
      const ts = u.lastActive || u.updatedAt || u.createdAt;
      const t = ts ? new Date(ts).getTime() : 0;
      const inactive = !t || (now - t) > DAYS_90_MS;

      if (inactive) {
        // Supprime la fiche utilisateur…
        await users.delete(b.key);

        // …et sa clé d'index (si on la trouve)
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

    return ok({ success: true, checked, deleted, kept, details });
  } catch (err) {
    console.error(err);
    return ok({ success: false, error: err.message }, 500);
  }
};
