// netlify/functions/capture-order.js
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
    const { orderId } = JSON.parse(event.body || '{}');
    if (!orderId) return { statusCode: 400, body: 'Missing orderId' };

    const access = await getAccessToken();
    const base = API(process.env.PAYPAL_ENV || 'sandbox');

    // CAPTURE
    const r = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access}`, 'Content-Type': 'application/json' }
    });

    const capture = await r.json();
    if (!r.ok) return { statusCode: r.status, body: JSON.stringify(capture) };

    // EXTRACTION DONNÉES
    const pu = capture?.purchase_units?.[0] || {};
    const cap = pu?.payments?.captures?.[0] || {};
    const amount = cap?.amount?.value || '0.00';
    const email  = capture?.payer?.email_address || '';
    const txn    = cap?.id || orderId;

    // custom_id = "creatorId|itemId|type"
    let creatorId = 'velvet', itemId = 'generic', type = 'ppv';
    if (pu?.custom_id && pu.custom_id.includes('|')) {
      const parts = pu.custom_id.split('|');
      creatorId = parts[0] || 'velvet';
      itemId    = parts[1] || 'generic';
      type      = parts[2] || 'ppv';
    }

    // ENREGISTREMENT DANS LEDGER
    try {
      await fetch(`${process.env.URL || ''}/api/record-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          type,
          amount: Number(amount),
          email,
          txn
        })
      });
    } catch (e) {
      // on ne bloque pas la capture si l’écriture échoue
      console.error('record-sale error', e);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, capture }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
