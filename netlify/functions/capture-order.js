exports.handler = async (event) => {
  try {
    const { orderID } = JSON.parse(event.body);

    const auth = Buffer.from(
      process.env.PAYPAL_CREATRICES_ID + ":" + process.env.PAYPAL_VIP_SECRET
    ).toString("base64");

    const response = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      }
    });

    const capture = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(capture)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
try {
  const purchaseUnit = cap.purchase_units && cap.purchase_units[0];
  const custom = purchaseUnit && purchaseUnit.custom_id; // "creatorId|itemId|type"
  const amount = +(purchaseUnit && purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures[0].amount.value || 0);
  let creatorId = 'velvet';
  if (custom && custom.includes('|')) creatorId = custom.split('|')[0] || 'velvet';

  await fetch(process.env.URL + '/.netlify/functions/record-sale', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ creatorId, amount })
  });
} catch (e) { /* on ignore l'erreur ledger pour ne pas casser la capture */ }
