// netlify/functions/set-account-status.js
import { getStore } from '@netlify/blobs';
const parse = (raw) => !raw ? null : (typeof raw === 'string' ? JSON.parse(raw) : raw);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method not allowed' };
  try {
    const { email, action, reason='' } = JSON.parse(event.body || '{}');
    if (!email || !action) return { statusCode:400, body:'Missing params' };

    const users = getStore('users');
    const raw = await users.get(email);
    const u = parse(raw);
    if (!u) return { statusCode:404, body:'User not found' };

    if (action === 'activate') u.status = 'active';
    else if (action === 'suspend') { u.status = 'suspended'; u.suspendReason = reason; }
    else if (action === 'delete') {
      if (typeof users.delete === 'function') {
        await users.delete(email);
      } else {
        // fallback : marque supprimé
        u.deleted = true;
        await users.set(email, JSON.stringify(u), { contentType: 'application/json' });
      }
      return { statusCode:200, body:'deleted' };
    } else {
      return { statusCode:400, body:'Unknown action' };
    }

    await users.set(email, JSON.stringify(u), { contentType: 'application/json' });
    return { statusCode:200, body: JSON.stringify({ ok:true }) };
  } catch (e) {
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
