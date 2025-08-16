// Retourne toutes les ventes + agrégats par créatrice

const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore({ name: "sales" });
    const list = await store.list(); // liste des clés
    const items = [];

    for (const k of list.blobs) {
      const txt = await store.get(k.key);
      if (!txt) continue;
      try { items.push(JSON.parse(txt)); } catch {}
    }

    // Agrégats par créatrice
    const perCreator = {};
    for (const s of items) {
      const cid = s.creatorId || "velvet";
      if (!perCreator[cid]) {
        perCreator[cid] = {
          creatorId: cid,
          count: 0,
          gross: 0,
          creatorShare: 0,
          platformShare: 0
        };
      }
      perCreator[cid].count += 1;
      perCreator[cid].gross += Number(s.amount || 0);
      perCreator[cid].creatorShare += Number(s.creatorShare || 0);
      perCreator[cid].platformShare += Number(s.platformShare || 0);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        items,
        perCreator: Object.values(perCreator)
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
