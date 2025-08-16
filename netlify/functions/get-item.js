// netlify/functions/get-item.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.rawQuery || event.queryStringParameters);
    const id = params.get('id');
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'itemId manquant' }) };

    // Récupère l'item stocké via upsert-item
    const store = getStore('items');
    const json = await store.get(`item:${id}`, { type: 'json' });

    if (!json) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Item introuvable' }) };
    }

    // On renvoie uniquement les champs utiles côté client
    const { itemId, creatorId, title, type, price, roomName } = json;
    return {
      statusCode: 200,
      body: JSON.stringify({ itemId, creatorId, title, type, price, roomName })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
