// Enregistre une vente dans un "ledger" (Blobs Netlify)

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    // Champs attendus (voir capture-order.js)
    const {
      creatorId = "velvet",
      itemId = null,
      itemType = null, // "ppv" | "live"
      amount = null,
      currency = "CHF",
      paypalTxnId = null,
      payerEmail = null,
      orderID = null,
      raw = null
    } = body;

    const store = getStore({ name: "sales" }); // collection "sales"
    const saleId = `sale_${Date.now()}`;

    const saleRecord = {
      id: saleId,
      ts: new Date().toISOString(),
      creatorId,
      itemId,
      itemType,
      amount: amount ? Number(amount) : null,
      currency,
      paypalTxnId,
      payerEmail,
      orderID,
      // utile pour calculs :
      platformShare: amount ? Number((Number(amount) * 0.30).toFixed(2)) : null,
      creatorShare: amount ? Number((Number(amount) * 0.70).toFixed(2)) : null,
      raw
    };

    await store.set(saleId, JSON.stringify(saleRecord));
    return { statusCode: 200, body: JSON.stringify({ ok: true, saleId }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
