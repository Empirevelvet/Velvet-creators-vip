// netlify/functions/list-users.js
import { getStore } from '@netlify/blobs';

export const handler = async () => {
  try {
    const users = getStore('users');
    const out = [];

    // list() parcourt toutes les clés (emails normalisés)
    const { blobs } = await users.list();
    for (const b of blobs || []) {
      const raw = await users.get(b.key);
      if (!raw) continue;
      const u = JSON.parse(raw);
      out.push({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role || 'client',
        status: u.status || 'pending',
        createdAt: u.createdAt || ''
      });
    }

    // tri du plus récent au plus ancien
    out.sort((a, b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: out })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
