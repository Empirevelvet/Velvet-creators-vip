const fetch = require('node-fetch');
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const { itemId } = JSON.parse(event.body || '{}');
    if (!itemId) return { statusCode: 400, body: JSON.stringify({ error: 'itemId manquant' }) };

    // Lire l'item (source de vérité pour le prix)
    const store = getStore('items');
    const raw = await store.get(`item:${itemId}`);
    if (!raw) return { statusCode: 404, body: JSON.stringify({ error: 'Item introuvable' }) };
    const item = JSON.parse(raw);

    const price = Number(item.price || 0);
    if (!(price > 0)) return { statusCode: 400, body: JSON.stringify({ error: 'Prix invalide' }) };

    // OAuth PayPal LIVE (tes variables Netlify)
    const auth = Buffer.from(`${process.env.PAYPAL_VIP_ID}:${process.env.PAYPAL_VIP_SECRET}`).toString('base64');
    const tokRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method:'POST',
      headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=client_credentials'
    });
    const { access_token } = await tokRes.json();

    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method:'POST',
      headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},
      body: JSON.stringify({
        intent:'CAPTURE',
        purchase_units:[{
          amount:{ currency_code:'CHF', value: price.toFixed(2) },
          description: `${item.title || 'Contenu'} (${item.type||'ppv'})`,
          custom_id: `${item.creatorId||'unknown'}|${item.itemId}|${item.type||'ppv'}`,
          invoice_id: `VX-${item.type||'ppv'}-${item.creatorId||'x'}-${Date.now()}`
        }]
      })
    });

    const order = await orderRes.json();
    if (!orderRes.ok) return { statusCode: orderRes.status, body: JSON.stringify(order) };
    return { statusCode: 200, body: JSON.stringify({ id: order.id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
// ... dans netlify/functions/create-order.js
body: JSON.stringify({
  intent: "CAPTURE",
  purchase_units: [{
    amount: { currency_code: "CHF", value: body.amount },
    // IMPORTANT : associer la vente
    custom_id: `${body.creatorId || "velvet"}|${body.itemId || ""}|${body.type || "ppv"}`
  }]
})
