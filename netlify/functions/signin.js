// netlify/functions/signin.js
// Connexion simple: compare le hash du mot de passe avec celui stocké dans le store "users"

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const json = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const { email, password } = JSON.parse(event.body || "{}");
    if (!email || !password) return json({ error: "Champs manquants" }, 400);

    const emailNorm = String(email).trim().toLowerCase();
    const users = getStore("users");

    // Récupère la fiche utilisateur par email normalisé
    const raw = await users.get(emailNorm);
    if (!raw) return json({ ok: false, error: "Compte introuvable" }, 401);

    const userDoc = JSON.parse(raw);
    // Hash du mot de passe saisi (doit matcher la logique de signup.js)
    const givenHash = crypto.createHash("sha256").update(String(password)).digest("hex");

    if (givenHash !== userDoc.passwordHash) {
      return json({ ok: false, error: "Mot de passe incorrect" }, 401);
    }

    // Optionnel: contrôle de statut si tu l'ajoutes dans users (pending/active/suspended)
    if (userDoc.status && userDoc.status !== "active") {
      return json({ ok: false, error: "Compte non actif" }, 403);
    }

    // On ne renvoie que les infos utiles côté client
    const safeUser = {
      id: userDoc.id,
      email: emailNorm,
      username: userDoc.username,
      role: userDoc.role || "client",  // "admin" si tu l’as marqué dans le profil
    };

    return json({ ok: true, user: safeUser });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "Erreur serveur" }, 500);
  }
};
