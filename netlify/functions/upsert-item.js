const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST')
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    const b = JSON.parse(event.body || '{}');
    const creatorId = String(b.creatorId||'').toLowerCase().trim();
    const title = String(b.title||'').trim();
    const type = String(b.type||'image').toLowerCase(); // image | video | live | objet...
    const previewUrl = String(b.previewUrl||'').trim();
    const price = Number(b.price);
    const roomName = type === 'live' ? String(b.roomName||'').trim() : '';

    if (!creatorId) return { statusCode: 400, body: JSON.stringify({ error: 'creatorId requis' }) };
    if (!(price > 0)) return { statusCode: 400, body: JSON.stringify({ error: 'prix > 0 requis' }) };
    if (type === 'live' && !roomName) return { statusCode: 400, body: JSON.stringify({ error: 'roomName requis pour live' }) };

    const store = getStore('items');
    const itemId = 'ITEM_'+Date.now().toString(36);

    const record = {
      itemId, creatorId, title, type, previewUrl,
      price: Math.round(price*100)/100,
      currency: 'CHF',
      status: 'available',
      roomName,
      createdAt: new Date().toISOString()
    };

    await store.set(`item:${itemId}`, JSON.stringify(record), { metadata: { creatorId, type } });
    return { statusCode: 200, body: JSON.stringify({ success:true, itemId, record }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
