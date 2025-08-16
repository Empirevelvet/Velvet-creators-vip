// netlify/functions/list-users.js
import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    const users = getStore("users");
    const q = event.queryStringParameters || {};
    const wantStatus = (q.status || "").toLowerCase(); // "", "pending", "approved", "rejected"
    const wantRole = (q.role || "").toLowerCase();     // "", "creator", "client"

    const keys = await users.list();
    const out = [];

    for (const b of keys.blobs || []) {
      const raw = await users.get(b.key);
      if (!raw) continue;
      let u;
      try { u = JSON.parse(raw); } catch { continue; }
      // normalisations au cas où des anciens comptes n'ont pas encore ces champs
      u.status = (u.status || "pending").toLowerCase();
      u.role   = (u.role   || "client").toLowerCase();

      if (wantStatus && u.status !== wantStatus) continue;
      if (wantRole && u.role !== wantRole) continue;

      // on ne renvoie pas le hash du mot de passe côté dashboard
      out.push({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        approvedAt: u.approvedAt || null,
        paypal: u.paypal || null,
      });
    }

    // plus récent d'abord
    out.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (e) {
    console.error("list-users error", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur serveur" }) };
  }
};
