const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Authentification PayPal
    const auth = Buffer.from(
      process.env.PAYPAL_CREATRICES_ID + ":" + process.env.PAYPAL_VIP_SECRET
    ).toString("base64");

    // Créer une commande PayPal
    const response = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "CHF",
            value: body.amount
          }
        }]
      })
    });

    const order = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(order)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
