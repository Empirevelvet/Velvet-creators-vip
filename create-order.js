exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const order = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: "CHF", value: body.amount }
      }]
    };

    return {
      statusCode: 200,
      body: JSON.stringify(order)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
