// netlify/functions/list-users.js
import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    const users = getStore("users");
    const q = event.queryStringParameters || {};
    const wantStatus = (q.status || "").toLowerCase();
    const wantRole   = (q.role || "").toLowerCase();

    const keys = await users.list();
    const out = [];

    for (const b of keys.blobs || []) {
      const raw = await users.get(b.key);
      if (!raw) continue;
      let u;
      try { u = JSON.parse(raw); } catch { continue; }
      u.status = (u.status || "pending").toLowerCase();
      u.role   = (u.role   || "client").toLowerCase();

      if (wantStatus && u.status !== wantStatus) continue;
      if (wantRole   && u.role   !== wantRole)   continue;

      out.push({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        status: u.status,
        statusReason: u.statusReason || null,
        createdAt: u.createdAt,
        approvedAt: u.approvedAt || null,
        paypal: u.paypal || null
      });
    }

    out.sort((a,b)=> new Date(b.createdAt||0) - new Date(a.createdAt||0));
    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur serveur" }) };
  }
};
