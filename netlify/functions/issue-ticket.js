// netlify/functions/issue-ticket.js
const { getStore } = require('@netlify/blobs');
function rnd(n=32){const a='abcdefghijklmnopqrstuvwxyz0123456789';let s='';for(let i=0;i<n;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    const { itemId } = JSON.parse(event.body || '{}');
    if (!itemId) return { statusCode: 400, body: JSON.stringify({ error: 'itemId requis' }) };

    // Lire l'item (live) pour connaître la room
    const items = getStore('items');
    const raw = await items.get(`item:${itemId}`);
    if (!raw) return { statusCode: 404, body: JSON.stringify({ error: 'Item introuvable' }) };
    const item = JSON.parse(raw);
    if (item.type !== 'live' || !item.roomName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Item non-live' }) };
    }

    // Générer un ticket (token) valable 2h
    const token = rnd(40);
    const ttlMs = 2 * 60 * 60 * 1000;
    const record = {
      token,
      roomName: item.roomName,
      itemId: item.itemId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      used: false
    };

    const tickets = getStore('tickets');
    await tickets.set(`ticket:${token}`, JSON.stringify(record), { metadata: { roomName: item.roomName } });

    return { statusCode: 200, body: JSON.stringify({ success: true, token, roomName: item.roomName }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
