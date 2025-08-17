// netlify/functions/list-users.js
import { getStore } from "@netlify/blobs";

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") return ok({ error:"Method not allowed" }, 405);

    const users = getStore("users");
    let keys = [];
    const listed = await users.list?.();
    if (Array.isArray(listed)) {
      keys = listed;
    } else if (listed?.blobs) {
      keys = listed.blobs.map(b=>b.key);
    } else {
      try { for await (const k of users.list()) keys.push(k.key || k); } catch(_){}
    }

    const out = [];
    for (const key of keys) {
      const raw = await users.get(key);
      if (!raw) continue;
      const u = JSON.parse(raw);
      out.push({
        id: u.id, email: u.email, username: u.username,
        role: u.role || 'client', status: u.status || 'pending',
        createdAt: u.createdAt || '', lastSeenAt: u.lastSeenAt || ''
      });
    }

    out.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    const pending = out.filter(u => (u.status||'pending') !== 'active').length;

    return ok({ ok:true, users: out, counts:{ total: out.length, pending } });
  } catch (e) {
    console.error("list-users error:", e);
    return ok({ ok:false, error:"Server error" }, 500);
  }
};
