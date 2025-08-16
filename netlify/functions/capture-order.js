// netlify/functions/capture-order.js
// Capture une commande PayPal puis enregistre la vente pour le dashboard

exports.handler = async (event) => {
  try {
    // 1) Récupérer l'orderID envoyé depuis paiement.html
    const { orderID } = JSON.parse(event.body);

    // 2) Authentification PayPal (utilise tes variables Netlify)
    const auth = Buffer.from(
      process.env.PAYPAL_CREATRICES_ID + ":" + process.env.PAYPAL_VIP_SECRET
    ).toString("base64");

    // 3) Appel PayPal CAPTURE
    const response = await fetch(
      `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
        },
      }
    );

    const capture = await response.json();

    // 4) Essayer d'enregistrer la vente dans le ledger (sans bloquer la capture si ça échoue)
    try {
      // On extrait quelques infos utiles de la réponse PayPal
      const purchaseUnit = capture?.purchase_units?.[0];
      const paypalCapture = purchaseUnit?.payments?.captures?.[0];

      // On récupère ce qu'on a mis en custom_id lors du create-order :
      // format recommandé: "creatorId|itemId|type"
      const custom = purchaseUnit?.custom_id || "";
      let creatorId = "velvet";
      let itemId = null;
      let itemType = null;

      if (custom.includes("|")) {
        const [cId, iId, t] = custom.split("|");
        creatorId = cId || "velvet";
        itemId = iId || null;
        itemType = t || null;
      }

      const amount = paypalCapture?.amount?.value || null;
      const currency = paypalCapture?.amount?.currency_code || "CHF";
      const paypalTxnId = paypalCapture?.id || null;
      const payerEmail =
        capture?.payer?.email_address ||
        capture?.payer?.payer_id ||
        null;

      // Appeler ta function Netlify "record-sale" (à créer si pas encore fait)
      await fetch(process.env.URL + "/.netlify/functions/record-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // minimum utile pour le dashboard
          creatorId,
          itemId,
          itemType,
          amount,
          currency,
          paypalTxnId,
          payerEmail,
          orderID,
          raw: capture, // optionnel: trace complète
        }),
      });
    } catch (e) {
      // On log mais on n'échoue pas la capture
      console.log("⚠️ Enregistrement ledger échoué (ignoré):", e);
    }

    // 5) Répondre au frontend avec la capture PayPal
    return {
      statusCode: 200,
      body: JSON.stringify(capture),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
