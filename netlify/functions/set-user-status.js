// netlify/functions/set-user-status.js
import { getStore } from "@netlify/blobs";

const allowed = new Set(["pending","approved","rejected"]);

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error:"Méthode non autorisée" }) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const emailInput = (body.email || "").trim().toLowerCase();
    const idInput = (body.id || "").trim();
    const newStatus = (body.status || "").toLowerCase();  // "approved" | "rejected" | "pending"
    const newRole = (body.role || "").toLowerCase();      // "creator" | "client" (optionnel)
    if (!allowed.has(newStatus)) {
      return { statusCode:400, body: JSON.stringify({ error:"Statut invalide" }) };
    }

    const users = getStore("users");
    let keyEmail = emailInput;

    // si on a seulement un id → retrouver l’email correspondant
    if (!keyEmail) {
      const keys = await users.list();
      for (const b of keys.blobs || []) {
        const raw = await users.get(b.key);
        if (!raw) continue;
        try {
          const u = JSON.parse(raw);
          if (u.id === idInput) { keyEmail = u.email; break; }
        } catch {}
      }
    }

    if (!keyEmail) {
      return { statusCode:404, body: JSON.stringify({ error:"Utilisateur introuvable" }) };
    }

    const raw = await users.get(keyEmail);
    if (!raw) return { statusCode:404, body: JSON.stringify({ error:"Utilisateur introuvable" }) };

    const u = JSON.parse(raw);
    u.status = newStatus;
    if (newStatus === "approved") u.approvedAt = new Date().toISOString();
    if (newRole) u.role = newRole; // si fourni, on met à jour le rôle
    await users.set(keyEmail, JSON.stringify(u));

    return { statusCode:200, body: JSON.stringify({ success:true, user:{
      id: u.id, email:u.email, username:u.username, role:u.role, status:u.status, approvedAt:u.approvedAt||null
    }})};
  } catch (e) {
    console.error("set-user-status error", e);
    return { statusCode:500, body: JSON.stringify({ error:"Erreur serveur" }) };
  }
};
