exports.handler = async (event) => {
  try {
    const { orderID } = JSON.parse(event.body);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, orderID })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
