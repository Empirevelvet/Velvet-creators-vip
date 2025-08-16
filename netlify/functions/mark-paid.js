// netlify/functions/mark-paid.js
// Marque une vente comme payée (vu dans le dashboard)

import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Méthode non autorisée" }) };
    }

    const { saleId } = JSON.parse(event.body || "{}");
    if (!saleId) {
      return { statusCode: 400, body: JSON.stringify({ error: "saleId requis" }) };
    }

    const salesStore = getStore("sales");
    const existing = await salesStore.get(saleId);
    if (!existing) {
      return { statusCode: 404, body: JSON.stringify({ error: "Vente introuvable" }) };
    }

    const sale = JSON.parse(existing);
    sale.paid = true;
    sale.paidAt = new Date().toISOString();

    await salesStore.set(saleId, JSON.stringify(sale));

    return { statusCode: 200, body: JSON.stringify({ success: true, sale }) };
  } catch (err) {
    console.error("mark-paid error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur serveur" }) };
  }
};
