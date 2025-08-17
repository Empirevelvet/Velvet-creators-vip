// netlify/functions/record-sale.js
import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    const { creatorId='creatrice-demo', type='ppv', amount=0, email='client@example.com', txn='test' } =
      JSON.parse(event.body || '{}');

    const store = getStore('ledger'); // <— clé unique LECTURE/ÉCRITURE
    const id = 'sale_' + Date.now();

    const row = {
      id,
      date: new Date().toISOString(),
      creatorId,
      type,
      amount: Number(amount),
      txn,
      email,
      paid: false
    };
    await store.set(id, JSON.stringify(row));

    return { statusCode: 200, body: JSON.stringify({ success:true, id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error:e.message }) };
  }
};
