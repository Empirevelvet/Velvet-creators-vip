// netlify/functions/mark-paid.js
import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { creatorId, txn } = JSON.parse(event.body || '{}');
    if (!creatorId && !txn) return { statusCode: 400, body: 'Missing creatorId or txn' };

    const store = getStore('ledger');
    const ids = await store.list();
    let count = 0;

    for (const id of ids.keys) {
      const raw = await store.get(id);
      if (!raw) continue;
      const row = JSON.parse(raw);

      const match = txn ? (row.txn === txn) : (row.creatorId === creatorId && !row.paid);
      if (match) {
        row.paid = true;
        row.paidAt = new Date().toISOString();
        await store.set(id, JSON.stringify(row));
        count++;
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, updated: count }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
