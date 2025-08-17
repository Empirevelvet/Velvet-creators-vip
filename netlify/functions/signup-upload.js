// netlify/functions/signup-upload.js
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import Busboy from "busboy";

const json = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control":"no-store" },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ success:false, error:"Méthode non autorisée" }, 405);

  try {
    // -------- Parser multipart
    const fields = {};
    const files = {};

    await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: event.headers });
      bb.on("file", (name, file, info) => {
        const { filename, mimeType } = info || {};
        const bufs = [];
        file.on("data", d => bufs.push(d));
        file.on("end", () => {
          files[name] = {
            buffer: Buffer.concat(bufs),
            filename: filename || name,
            mime: mimeType || "application/octet-stream"
          };
        });
      });
      bb.on("field", (name, val) => { fields[name] = val; });
      bb.on("error", reject);
      bb.on("finish", resolve);
      const body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
      bb.end(body);
    });

    // -------- Validations
    const emailRaw    = (fields.email || "").trim();
    const usernameRaw = (fields.username || fields.handle || "").trim();
    const passwordRaw = (fields.password || "").trim();
    const roleRaw     = (fields.role || "").trim();

    if (!emailRaw || !usernameRaw || !passwordRaw) {
      return json({ success:false, error:"Champs manquants (email, pseudo, mot de passe)." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return json({ success:false, error:"Email invalide." }, 400);
    }
    if (usernameRaw.length < 3) {
      return json({ success:false, error:"Le pseudo doit contenir au moins 3 caractères." }, 400);
    }
    if (passwordRaw.length < 6) {
      return json({ success:false, error:"Le mot de passe doit contenir au moins 6 caractères." }, 400);
    }
    if (!files.id_front || !files.id_back || !files.selfie) {
      return json({ success:false, error:"Pièces d’identité et selfie requis." }, 400);
    }

    // -------- Normalisations
    const emailNorm    = emailRaw.toLowerCase();
    const usernameNorm = usernameRaw.toLowerCase().replace(/\s+/g, "");
    const usernameClean = usernameRaw.replace(/\s+/g, "");

    let roleNorm = "client";
    if (roleRaw) {
      const r = roleRaw.toLowerCase();
      if (r.includes("créatrice") || r.includes("creatrice") || r.includes("creator") || r.includes("créateur")) {
        roleNorm = "creator";
      }
    }

    // -------- Stores blobs
    const usersStore = getStore("users");          // clé = email normalisé
    const byUserStore = getStore("by_username");   // clé = username normalisé
    const kycStore   = getStore("kyc");            // fichiers KYC

    // Doublons
    if (await usersStore.get(emailNorm))    return json({ success:false, error:"Email déjà utilisé." }, 409);
    if (await byUserStore.get(usernameNorm)) return json({ success:false, error:"Pseudo déjà pris." }, 409);

    // Hash mot de passe
    const passwordHash = crypto.createHash("sha256").update(passwordRaw).digest("hex");

    // -------- Créer user + sauver fichiers
    const now = new Date().toISOString();
    const uid = "user_" + crypto.randomUUID();

    const saveFile = async (key, file) => {
      const ext = (file.filename.split('.').pop() || '').toLowerCase();
      const safeKey = `${uid}/${key}.${ext || 'bin'}`;
      await kycStore.set(safeKey, file.buffer, { contentType: file.mime });
      return safeKey;
    };

    const avatarKey  = files.avatar  ? await saveFile("avatar",  files.avatar)  : null;
    const frontKey   = await saveFile("id_front", files.id_front);
    const backKey    = await saveFile("id_back",  files.id_back);
    const selfieKey  = await saveFile("selfie",   files.selfie);

    const userDoc = {
      id: uid,
      email: emailNorm,
      username: usernameClean,
      usernameLower: usernameNorm,
      role: roleNorm,           // "creator" ou "client"
      passwordHash,
      createdAt: now,
      status: "pending",
      profile: {
        fullname: (fields.fullname || "").trim(),
        phone:    (fields.phone    || "").trim(),
        address:  (fields.address  || "").trim(),
        country:  (fields.country  || "").trim(),
        dob:      (fields.dob      || "").trim(),
        avatarKey,
        kyc: { id_front: frontKey, id_back: backKey, selfie: selfieKey }
      }
    };

    await Promise.all([
      usersStore.set(emailNorm, JSON.stringify(userDoc)),
      byUserStore.set(usernameNorm, JSON.stringify({ id: uid, email: emailNorm }))
    ]);

    return json({ success:true, id: uid, user: { email: emailNorm, username: usernameClean, role: roleNorm, status: "pending", createdAt: now } });
  } catch (err) {
    console.error("signup-upload error", err);
    return json({ success:false, error:"Erreur serveur." }, 500);
  }
};
