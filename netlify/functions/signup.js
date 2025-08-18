// /netlify/functions/signup.js
// Inscription : anti‑doublons + enregistrement des fichiers dans Netlify Blobs.
// Le client envoie du JSON (pas de multipart).
// >> NÉCESSITE @netlify/blobs dans package.json (tu l’as déjà).

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return ok({ error: "Méthode non autorisée" }, 405);

  try {
    const input = JSON.parse(event.body || "{}");

    // champs attendus
    const {
      username = "",
      email = "",
      password = "",
      fullname = "",
      phone = "",
      address = "",
      country = "",
      dob = "",
      role = "",                     // "creatrice" | "client"
      files = {},                    // { avatar?, idFront?, idBack?, selfie? }  (optionnels)
    } = input;

    // validations
    if (!username || !email || !password)
      return ok({ error: "Champs obligatoires manquants (pseudo, email, mot de passe)." }, 400);

    const emailNorm = String(email).trim().toLowerCase();
    const usernameClean = String(username).trim();
    const usernameNorm  = usernameClean.toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return ok({ error: "E‑mail invalide" }, 400);
    }
    if (!/^[A-Za-z0-9._-]{3,20}$/.test(usernameClean)) {
      return ok({ error: "Pseudo invalide (3‑20 caractères, lettres/chiffres . _ - uniquement)" }, 400);
    }
    if (String(password).length < 6) {
      return ok({ error: "Mot de passe trop court (min. 6)" }, 400);
    }

    // stores (Netlify Blobs KV)
    const users      = getStore("users");        // clé = email
    const byUsername = getStore("by_username");  // clé = usernameNorm -> email

    // anti‑doublons
    const existsByEmail = await users.get(emailNorm);
    if (existsByEmail) return ok({ error: "Email déjà utilisé" }, 409);

    const existsByUsername = await byUsername.get(usernameNorm);
    if (existsByUsername) return ok({ error: "Pseudo déjà pris" }, 409);

    // hash du mot de passe (SHA‑256 simple)
    const passwordHash = crypto.createHash("sha256").update(String(password)).digest("hex");

    // Enregistrer les fichiers éventuels dans un store "files"
    const fileStore = getStore("files");
    async function saveBase64File(obj, prefix) {
      // obj attendu : { name, type, data } avec data = base64
      if (!obj || !obj.data) return "";
      const key = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const buf = Buffer.from(obj.data, "base64");
      await fileStore.set(key, buf, { metadata: { name: obj.name || "", type: obj.type || "" } });
      return key; // on stocke juste la clé
    }

    const avatarKey  = await saveBase64File(files.avatar,  "avatar");
    const idFrontKey = await saveBase64File(files.idFront, "id-front");
    const idBackKey  = await saveBase64File(files.idBack,  "id-back");
    const selfieKey  = await saveBase64File(files.selfie,  "selfie");

    // création document
    const uid = "user_" + Date.now();
    const now = new Date().toISOString();

    const userDoc = {
      id: uid,
      email: emailNorm,
      username: usernameClean,
      usernameLower: usernameNorm,
      passwordHash,
      fullname,
      phone,
      address,
      country,
      dob,
      role: role === "creatrice" ? "creatrice" : "client",
      status: "pending", // en attente de validation
      createdAt: now,
      files: {
        avatar:  avatarKey  || "",
        idFront: idFrontKey || "",
        idBack:  idBackKey  || "",
        selfie:  selfieKey  || "",
      },
    };

    // sauvegarde atomique : index par username puis fiche utilisateur
    await byUsername.set(usernameNorm, emailNorm);
    await users.set(emailNorm, JSON.stringify(userDoc));

    return ok({ success: true, id: uid, username: usernameClean });
  } catch (err) {
    console.error(err);
    return ok({ error: "Erreur serveur" }, 500);
  }
};
