// Enregistre un ticket de modération
import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode:405, body: JSON.stringify({ error:"Méthode non autorisée" }) };

  try{
    const body = JSON.parse(event.body||"{}");
    const reporterEmail = String(body.reporterEmail||"").trim().toLowerCase();
    const target = String(body.target||"").trim();
    const reason = String(body.reason||"").trim();
    const details = String(body.details||"").trim();

    if (!reporterEmail || !target || !reason)
      return { statusCode:400, body: JSON.stringify({ error:"Champs requis manquants" }) };

    const tickets = getStore("reports");
    const id = "rep_"+Date.now().toString(36);
    const doc = { id, ts:new Date().toISOString(), reporterEmail, target, reason, details, status:"open" };
    await tickets.set(id, JSON.stringify(doc));
    return { statusCode:200, body: JSON.stringify({ ok:true, id }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
