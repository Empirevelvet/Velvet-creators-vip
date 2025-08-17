// netlify/functions/create-order.js
const API = (env) => env === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const base = API(process.env.PAYPAL_ENV || 'sandbox');
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const r = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) throw new Error(`PayPal token ${r.status}`);
  const j = await r.json();
  return j.access_token;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { amount, currency='CHF', description='Achat Velvet', creatorId='velvet', itemId='generic', type='ppv' } =
      JSON.parse(event.body || '{}');

    if (!amount) return { statusCode: 400, body: 'Missing amount' };

    const access = await getAccessToken();
    const base = API(process.env.PAYPAL_ENV || 'sandbox');

    const body = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: currency, value: String(Number(amount).toFixed(2)) },
        description,
        custom_id: `${creatorId}|${itemId}|${type}`
      }],
      application_context: {
        brand_name: 'Velvet',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: `${process.env.URL || ''}/paiement.html?status=approved`,
        cancel_url: `${process.env.URL || ''}/paiement.html?status=cancelled`
      }
    };

    const r = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    if (!r.ok) return { statusCode: r.status, body: JSON.stringify(data) };

    return { statusCode: 200, body: JSON.stringify({ success: true, id: data.id, links: data.links || [] }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
