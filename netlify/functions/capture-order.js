const fetch = require("node-fetch");

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
