// netlify/functions/signup.js
// Création de compte (créatrice / client) avec stockage @netlify/blobs
// - Empêche les doublons (email & pseudo)
// - Normalise le rôle: "Créatrice" -> "creator", "Client" -> "client"
// - Hash le mot de passe (SHA-256)

import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const json = (body, status = 200) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json({ success: false, error: "Méthode non autorisée" }, 405);
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const emailRaw    = (payload.email || "").trim();
    const usernameRaw = (payload.username || payload.handle || "").trim();
    const passwordRaw = (payload.password || "").trim();
    const roleRaw     = (payload.role || "").trim(); // ex. "Créatrice" ou "Client"

    // --- validations simples ---
    if (!emailRaw || !usernameRaw || !passwordRaw) {
      return json({ success: false, error: "Champs manquants (email, pseudo, mot de passe)." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return json({ success: false, error: "Email invalide." }, 400);
    }
    if (usernameRaw.length < 3) {
      return json({ success: false, error: "Le pseudo doit contenir au moins 3 caractères." }, 400);
    }
    if (passwordRaw.length < 6) {
      return json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères." }, 400);
    }

    // --- normalisations ---
    const emailNorm    = emailRaw.toLowerCase();
    const usernameNorm = usernameRaw.toLowerCase().replace(/\s+/g, "");
    const usernameClean = usernameRaw.replace(/\s+/g, "");

    // Normalisation du rôle ("Créatrice" -> "creator", "Client" -> "client")
    let roleNorm = "client";
    if (roleRaw) {
      const r = roleRaw.toLowerCase();
      if (r.includes("créatrice") || r.includes("creatrice") || r.includes("creator") || r.includes("créateur")) {
        roleNorm = "creator";
      } else if (r.includes("client")) {
        roleNorm = "client";
      }
    }

    // --- stores blobs ---
    const usersStore = getStore("users");         // clé = email normalisé
    const byUserStore = getStore("by_username");  // clé = username normalisé

    // --- doublons ---
    const emailExists = await usersStore.get(emailNorm);
    if (emailExists) {
      return json({ success: false, error: "Email déjà utilisé." }, 409);
    }
    const usernameExists = await byUserStore.get(usernameNorm);
    if (usernameExists) {
      return json({ success: false, error: "Pseudo déjà pris." }, 409);
    }

    // --- hash mot de passe ---
    const passwordHash = crypto.createHash("sha256").update(passwordRaw).digest("hex");

    // --- doc utilisateur ---
    const now = new Date().toISOString();
    const uid = "user_" + crypto.randomUUID();

    const userDoc = {
      id: uid,
      email: emailNorm,
      username: usernameClean,      // version affichable
      usernameLower: usernameNorm,  // pour recherches
      role: roleNorm,               // "creator" ou "client"
      passwordHash,
      createdAt: now,
      status: "pending"             // tu peux passer à "active" après validation admin
    };

    // --- écriture atomique ---
    await Promise.all([
      usersStore.set(emailNorm, JSON.stringify(userDoc)),
      byUserStore.set(usernameNorm, JSON.stringify({ id: uid, email: emailNorm }))
    ]);

    // --- réponse safe (sans hash) ---
    return json({
      success: true,
      id: uid,
      user: {
        email: emailNorm,
        username: usernameClean,
        role: roleNorm,
        status: "pending",
        createdAt: now
      }
    });
  } catch (err) {
    console.error("signup error:", err);
    return json({ success: false, error: "Erreur serveur." }, 500);
  }
};
