// netlify/functions/signup.js
// Inscription unifiée : JSON ou multipart/form-data (avec fichiers).
// - Déduplication email & pseudo
// - Hash mot de passe (SHA‑256 simple)
// - Sauvegarde fichiers dans Netlify Blobs

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

/* ---------- helpers ---------- */
const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// mini parser multipart (suffisant pour formulaire simple)
// NOTE: on travaille en latin1 pour préserver les octets tels quels.
function parseMultipart(event) {
  const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
  const m = ct.match(/boundary=([^;]+)/i);
  if (!m) throw new Error("Boundary introuvable");
  const boundary = m[1];

  const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
  const text = raw.toString("latin1");

  const sep = `--${boundary}`;
  const chunks = text.split(sep).slice(1, -1);

  const fields = {};
  const files = []; // { name, filename, contentType, buffer }

  for (const part of chunks) {
    // coupe headers / contenu
    const idx = part.indexOf("\r\n\r\n");
    if (idx < 0) continue;
    const head = part.slice(0, idx);
    let body = part.slice(idx + 4);

    // retire le \r\n final de la partie
    if (body.endsWith("\r\n")) body = body.slice(0, -2);

    const disp = /Content-Disposition:.*name="([^"]+)"(?:; *filename="([^"]*)")?/i.exec(head);
    if (!disp) continue;
    const name = disp[1];
    const filename = disp[2];

    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(head);
    const contentType = typeMatch ? typeMatch[1].trim() : "application/octet-stream";

    if (filename) {
      const buffer = Buffer.from(body, "latin1");
      files.push({ name, filename, contentType, buffer });
    } else {
      // champ texte
      fields[name] = body;
    }
  }
  return { fields, files };
}

/* ---------- handler ---------- */
export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return ok({ error: "Méthode non autorisée" }, 405);
    }

    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";

    // Données collectées
    let email = "";
    let username = "";
    let password = "";
    let role = ""; // "creatrice" | "client"
    let fullname = "";
    let phone = "";
    let address = "";
    let country = "";
    let dob = "";

    // Fichiers potentiels
    let avatarKey = "";
    let idFrontKey = "";
    let idBackKey = "";
    let selfieKey = "";

    if (/multipart\/form-data/i.test(ct)) {
      // ------ formulaire avec fichiers ------
      const { fields, files } = parseMultipart(event);

      email = String(fields.email || "").trim();
      username = String(fields.username || "").trim();
      password = String(fields.password || "").trim();
      role = String(fields.role || "").trim(); // "creatrice" / "client"
      fullname = String(fields.fullname || "").trim();
      phone = String(fields.phone || "").trim();
      address = String(fields.address || "").trim();
      country = String(fields.country || "").trim();
      dob = String(fields.dob || "").trim();

      // Stocke fichiers dans Blobs (store "uploads")
      const uploads = getStore("uploads");

      // helper pour stocker et renvoyer la clé
      const saveFile = async (file, keyHint) => {
        if (!file || !file.buffer || !file.buffer.length) return "";
        const key = `${keyHint}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await uploads.set(key, file.buffer, { contentType: file.contentType || "application/octet-stream" });
        return key;
      };

      // Les noms "avatar", "id_front", "id_back", "selfie" doivent correspondre aux <input name="">
      const fAvatar = files.find(f => f.name === "avatar");
      const fFront  = files.find(f => f.name === "id_front");
      const fBack   = files.find(f => f.name === "id_back");
      const fSelfie = files.find(f => f.name === "selfie");

      avatarKey = await saveFile(fAvatar, "avatar");
      idFrontKey = await saveFile(fFront, "id-front");
      idBackKey  = await saveFile(fBack, "id-back");
      selfieKey  = await saveFile(fSelfie, "selfie");

    } else {
      // ------ JSON classique ------
      const { email: e, username: u, password: p, role: r,
              fullname: fn, phone: ph, address: ad, country: co, dob: d } =
        JSON.parse(event.body || "{}");

      email = String(e || "").trim();
      username = String(u || "").trim();
      password = String(p || "").trim();
      role = String(r || "").trim();
      fullname = String(fn || "").trim();
      phone = String(ph || "").trim();
      address = String(ad || "").trim();
      country = String(co || "").trim();
      dob = String(d || "").trim();
    }

    // ------ validations ------
    if (!email || !username || !password) {
      return ok({ error: "Champs manquants (email, pseudo, mot de passe)" }, 400);
    }

    const emailNorm = email.toLowerCase();
    const usernameClean = username;
    const usernameNorm = usernameClean.toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailNorm)) {
      return ok({ error: "E‑mail invalide" }, 400);
    }
    if (!/^[A-Za-z0-9._-]{3,20}$/.test(usernameClean)) {
      return ok({ error: "Pseudo invalide (3–20 caractères, lettres/chiffres/._- uniquement)" }, 400);
    }
    if (String(password).length < 6) {
      return ok({ error: "Mot de passe trop court (min. 6)" }, 400);
    }
    if (role && !["creatrice", "client"].includes(role)) {
      return ok({ error: "Rôle invalide" }, 400);
    }

    // ------ stores ------
    const users = getStore("users");            // fiches utilisateur (clé = email)
    const byUsername = getStore("by_username"); // index pseudo -> email

    // doublons
    const existingByEmail = await users.get(emailNorm);
    if (existingByEmail) {
      return ok({ error: "Email déjà utilisé" }, 409);
    }
    const existingEmailForUsername = await byUsername.get(usernameNorm);
    if (existingEmailForUsername) {
      return ok({ error: "Pseudo déjà pris" }, 409);
    }

    // hash mot de passe (simple)
    const passwordHash = crypto.createHash("sha256").update(String(password)).digest("hex");

    // fiche
    const uid = "user_" + Date.now();
    const now = new Date().toISOString();

    const userDoc = {
      id: uid,
      createdAt: now,

      email: emailNorm,
      username: usernameClean,
      usernameLower: usernameNorm,

      role: role || "creatrice", // par défaut créatrice si non fourni
      fullname,
      phone,
      address,
      country,
      dob,

      passwordHash,

      // clés blobs des fichiers (si reçus)
      files: {
        avatar: avatarKey || "",
        idFront: idFrontKey || "",
        idBack: idBackKey || "",
        selfie: selfieKey || "",
      },

      // statut d’entrée (en attente de validation)
      status: "pending",
    };

    // sauvegarde atomique : d’abord l’index, puis la fiche
    await byUsername.set(usernameNorm, emailNorm);
    await users.set(emailNorm, JSON.stringify(userDoc));

    return ok({ success: true, id: uid, username: usernameClean });
  } catch (err) {
    console.error(err);
    return ok({ error: "Erreur serveur" }, 500);
  }
};
