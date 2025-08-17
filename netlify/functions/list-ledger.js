// netlify/functions/list-ledger.js
import { getStore } from '@netlify/blobs';
const asKeys = (lst) => Array.isArray(lst) ? lst : (lst?.keys || []);
const parse = (raw) => !raw ? null : (typeof raw === 'string' ? JSON.parse(raw) : raw);

export const handler = async () => {
  try {
    const store = getStore('ledger');
    const ids = await store.list();
    const rows = [];
    for (const id of asKeys(ids)) {
      const raw = await store.get(id);
      const obj = parse(raw);
      if (obj) rows.push(obj);
    }

    const creators = {};
    for (const r of rows) {
      const cid = r.creatorId || 'velvet';
      creators[cid] = creators[cid] || { total:0, dueToCreator:0, dueToVelvet:0, unpaid:0 };
      const amt = Number(r.amount||0);
      creators[cid].total += amt;
      creators[cid].dueToCreator += amt*0.70;
      creators[cid].dueToVelvet  += amt*0.30;
      if (!r.paid) creators[cid].unpaid += amt*0.70;
    }

    return { statusCode: 200, body: JSON.stringify({ rows, creators }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
