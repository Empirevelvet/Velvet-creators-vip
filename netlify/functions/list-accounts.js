// netlify/functions/list-accounts.js
import { getStore } from '@netlify/blobs';
const asKeys = (lst) => Array.isArray(lst) ? lst : (lst?.keys || []);
const parse = (raw) => !raw ? null : (typeof raw === 'string' ? JSON.parse(raw) : raw);

export const handler = async () => {
  try {
    const users = getStore('users'); // même clé que signup.js
    const keys = await users.list();
    const out = [];
    for (const k of asKeys(keys)) {
      const raw = await users.get(k);
      const u = parse(raw);
      if (!u) continue;
      out.push({
        email: u.email,
        username: u.username,
        role: u.role || 'client',
        status: u.status || 'pending',
        createdAt: u.createdAt || u.created_at || ''
      });
    }
    return { statusCode:200, body: JSON.stringify({ accounts: out }) };
  } catch (e) {
    return { statusCode:500, body: JSON.stringify({ error: e.message }) };
  }
};
