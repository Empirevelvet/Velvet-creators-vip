// netlify/functions/list-ledger.js
// Récupère toutes les ventes et calcule les totaux

import { getStore } from "@netlify/blobs";

export const handler = async () => {
  try {
    const salesStore = getStore("sales");

    // Récupération brute des ventes
    const allKeys = await salesStore.list();
    const sales = [];
    for (const key of allKeys.blobs) {
      const raw = await salesStore.get(key.key);
      if (raw) sales.push(JSON.parse(raw));
    }

    // Calcul des totaux par créatrice
    const ledger = {};
    for (const sale of sales) {
      const { creatorId = "velvet", amount = 0, paid = false } = sale;
      if (!ledger[creatorId]) {
        ledger[creatorId] = { total: 0, owed: 0, paidOut: 0 };
      }
      ledger[creatorId].total += amount;
      if (paid) {
        ledger[creatorId].paidOut += amount * 0.7; // 70% pour la créatrice
      } else {
        ledger[creatorId].owed += amount * 0.7;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sales, ledger })
    };
  } catch (err) {
    console.error("list-ledger error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur serveur" }) };
  }
};
