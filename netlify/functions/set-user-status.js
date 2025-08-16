// netlify/functions/set-user-status.js
import { getStore } from "@netlify/blobs";

const allowed = new Set(["pending","approved","rejected","suspended","deleted"]);

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error:"Méthode non autorisée" }) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const emailInput = (body.email || "").trim().toLowerCase();
    const idInput    = (body.id || "").trim();
    const newStatus  = (body.status || "").toLowerCase();         // approved | rejected | suspended | pending | deleted
    const newRole    = (body.role || "").toLowerCase();           // optionnel: creator | client
    const reason     = (body.reason || "").trim();                // optionnel: motif d’admin

    if (!allowed.has(newStatus)) {
      return { statusCode:400, body: JSON.stringify({ error:"Statut invalide" }) };
    }

    const users = getStore("users");
    let keyEmail = emailInput;

    // retrouver l'email si on a seulement l'id
    if (!keyEmail) {
      const keys = await users.list();
      for (const b of keys.blobs || []) {
        const raw = await users.get(b.key); if (!raw) continue;
        try { const u = JSON.parse(raw); if (u.id === idInput){ keyEmail = u.email; break; } } catch {}
      }
    }
    if (!keyEmail) return { statusCode:404, body: JSON.stringify({ error:"Utilisateur introuvable" }) };

    const raw = await users.get(keyEmail);
    if (!raw) return { statusCode:404, body: JSON.stringify({ error:"Utilisateur introuvable" }) };

    const u = JSON.parse(raw);
    u.status = newStatus;
    if (newStatus === "approved") u.approvedAt = new Date().toISOString();
    if (newRole) u.role = newRole;

    // Historique/modération
    u.moderation = Array.isArray(u.moderation) ? u.moderation : [];
    u.moderation.push({
      at: new Date().toISOString(),
      action: newStatus,
      reason: reason || null
    });
    // dernier motif “lisible”
    u.statusReason = reason || null;

    await users.set(keyEmail, JSON.stringify(u));

    return { statusCode:200, body: JSON.stringify({
      success:true,
      user:{ id:u.id, email:u.email, username:u.username, role:u.role, status:u.status, approvedAt:u.approvedAt||null, statusReason:u.statusReason||null }
    })};
  } catch (e) {
    return { statusCode:500, body: JSON.stringify({ error:"Erreur serveur" }) };
  }
};
