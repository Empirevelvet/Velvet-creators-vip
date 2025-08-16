// netlify/functions/verify-ticket.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const token = (event.queryStringParameters?.token || '').trim();
    const room = (event.queryStringParameters?.room || '').trim();
    if (!token || !room) return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Paramètres manquants' }) };

    const tickets = getStore('tickets');
    const raw = await tickets.get(`ticket:${token}`);
    if (!raw) return { statusCode: 404, body: JSON.stringify({ ok:false, error:'Ticket inconnu' }) };

    const t = JSON.parse(raw);
    if (t.roomName !== room) return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Salle invalide' }) };
    if (t.used) return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Ticket déjà utilisé' }) };
    if (Date.now() > t.expiresAt) return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Ticket expiré' }) };

    // Marque le ticket comme utilisé (anti-partage)
    t.used = true;
    await tickets.set(`ticket:${token}`, JSON.stringify(t), { metadata: { roomName: t.roomName } });

    return { statusCode: 200, body: JSON.stringify({ ok:true, room: t.roomName }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
