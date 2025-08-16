// netlify/functions/delete-user.js
// Supprime un compte : soft delete par défaut (status=deleted, retire l'index pseudo)
// Hard delete si body.hard === true : efface la fiche utilisateur.
// On conserve les ventes existantes (audit), mais on peut anonymiser le username si besoin.

import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode:405, body: JSON.stringify({ error:"Méthode non autorisée" }) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const emailInput = (body.email || "").trim().toLowerCase();
    const idInput    = (body.id || "").trim();
    const hard       = !!body.hard;

    const users = getStore("users");
    const byUsername = getStore("by_username");

    // Retrouver l'email si on a seulement l'id
    let keyEmail = emailInput;
    let userDoc  = null;

    if (!keyEmail) {
      const keys = await users.list();
      for (const b of keys.blobs || []) {
        const raw = await users.get(b.key); if (!raw) continue;
        try { const u = JSON.parse(raw); if (u.id === idInput){ keyEmail = u.email; userDoc = u; break; } } catch {}
      }
      if (!keyEmail) return { statusCode:404, body: JSON.stringify({ error:"Utilisateur introuvable" }) };
    }

    if (!userDoc) {
      const raw = await users.get(keyEmail);
      if (!raw) return { statusCode:404, body: JSON.stringify({ error:"Utilisateur introuvable" }) };
      userDoc = JSON.parse(raw);
    }

    // Retirer l'index pseudo -> email
    if (userDoc.usernameLower) {
      try { await byUsername.delete(userDoc.usernameLower); } catch {}
    }

    if (hard) {
      // Suppression définitive du document
      await users.delete(keyEmail);
    } else {
      // Soft delete : status=deleted + anonymisation optionnelle
      userDoc.status = "deleted";
      // anonymiser si tu veux aller plus loin :
      // userDoc.username = "deleted_"+userDoc.id.slice(-6);
      // userDoc.usernameLower = userDoc.username.toLowerCase();
      await users.set(keyEmail, JSON.stringify(userDoc));
    }

    return { statusCode:200, body: JSON.stringify({ success:true, hard }) };
  } catch (e) {
    return { statusCode:500, body: JSON.stringify({ error:"Erreur serveur" }) };
  }
};
