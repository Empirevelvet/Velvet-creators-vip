// netlify/functions/get-user.js
import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const email = (q.email || "").trim().toLowerCase();
    const id = (q.id || "").trim();

    const users = getStore("users");
    let doc = null;

    if (email) {
      const raw = await users.get(email);
      if (raw) doc = JSON.parse(raw);
    } else if (id) {
      const keys = await users.list();
      for (const b of keys.blobs || []) {
        const raw = await users.get(b.key);
        if (!raw) continue;
        const u = JSON.parse(raw);
        if (u.id === id) { doc = u; break; }
      }
    } else {
      return { statusCode:400, body: JSON.stringify({ error:"email ou id requis" }) };
    }

    if (!doc) return { statusCode:404, body: JSON.stringify({ error:"introuvable" }) };

    // on filtre les champs sensibles
    const safe = {
      id: doc.id, email: doc.email, username: doc.username,
      role: (doc.role||"client"), status:(doc.status||"pending"),
      createdAt: doc.createdAt, approvedAt: doc.approvedAt||null, paypal: doc.paypal||null
    };
    return { statusCode:200, body: JSON.stringify(safe) };
  } catch (e) {
    return { statusCode:500, body: JSON.stringify({ error:"Erreur serveur" }) };
  }
};
