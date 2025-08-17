// netlify/functions/record-sale.js
import { getStore } from '@netlify/blobs';
const asKeys = (lst) => Array.isArray(lst) ? lst : (lst?.keys || []);
const parse = (raw) => !raw ? null : (typeof raw === 'string' ? JSON.parse(raw) : raw);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { creatorId='velvet', type='ppv', amount=0, email='', txn='' } = JSON.parse(event.body || '{}');

    const store = getStore('ledger');
    const id = 'sale_' + Date.now();
    const row = {
      id,
      date: new Date().toISOString(),
      creatorId,
      type,
      amount: Number(amount) || 0,
      email,
      txn,
      paid: false
    };
    await store.set(id, JSON.stringify(row), { contentType: 'application/json' });
    return { statusCode: 200, body: JSON.stringify({ success:true, id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
