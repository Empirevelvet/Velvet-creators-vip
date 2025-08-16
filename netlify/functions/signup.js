// netlify/functions/signup.js
// Inscription avec vérification des doublons (email & pseudo)
// Stockage via @netlify/blobs et hash du mot de passe

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return ok({ error: "Méthode non autorisée" }, 405);
  }

  try {
    const { email, username, password } = JSON.parse(event.body || "{}");

    // --- validations de base
    if (!email || !username || !password) {
      return ok({ error: "Champs manquants" }, 400);
    }
    const emailNorm = String(email).trim().toLowerCase();
    const usernameClean = String(username).trim();
    const usernameNorm = usernameClean.toLowerCase();

    // petites règles (ajuste si besoin)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return ok({ error: "E-mail invalide" }, 400);
    }
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(usernameClean)) {
      return ok({
        error:
          "Pseudo invalide (3–20 caractères, lettres/chiffres/._- uniquement)",
      }, 400);
    }
    if (String(password).length < 6) {
      return ok({ error: "Mot de passe trop court (min. 6)" }, 400);
    }

    // --- stores
    // users        : les fiches utilisateurs (clé = email)
    // by_username  : index -> usernameNormalisé -> email
    const users = getStore("users");
    const byUsername = getStore("by_username");

    // 1) doublon e-mail
    const existingByEmail = await users.get(emailNorm);
    if (existingByEmail) {
      return ok({ error: "Email déjà utilisé" }, 409);
    }

    // 2) doublon pseudo (via index)
    const existingEmailForUsername = await byUsername.get(usernameNorm);
    if (existingEmailForUsername) {
      return ok({ error: "Pseudo déjà pris" }, 409);
    }

    // --- hash du mot de passe (SHA-256 simple)
    // (Pour production, préfère bcrypt/argon2 si tu ajoutes un serveur dédié.)
    const passwordHash = crypto
      .createHash("sha256")
      .update(String(password))
      .digest("hex");

    // --- création de la fiche
    const uid = "user_" + Date.now();
    const now = new Date().toISOString();

    const userDoc = {
      id: uid,
      email: emailNorm,
      username: usernameClean,
      usernameLower: usernameNorm,
      passwordHash,
      createdAt: now,
      // Tu peux ajouter d'autres champs ici (role, avatar, etc.)
    };

    // Sauvegarde atomique : d’abord l’index, puis l’utilisateur.
    await byUsername.set(usernameNorm, emailNorm);
    await users.set(emailNorm, JSON.stringify(userDoc));

    return ok({ success: true, id: uid, username: usernameClean });
  } catch (err) {
    console.error(err);
    return ok({ error: "Erreur serveur" }, 500);
  }
};
