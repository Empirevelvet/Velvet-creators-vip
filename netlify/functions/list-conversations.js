// netlify/functions/list-conversations.js
exports.handler = async ()=>{
  // Stub d’exemple
  const items = [
    { date:new Date().toISOString(), participants:['@sofia','client@ex.com'], lastMessage:'OK pour 20 CHF ?', updatedAt:Date.now() },
  ];
  return { statusCode:200, body: JSON.stringify({ items }) };
};
