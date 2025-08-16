import fetch from "node-fetch";
import { getStore } from "@netlify/blobs";

const base = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function getAccessToken(){
  const id = process.env.PAYPAL_VIP_ID;
  const secret = process.env.PAYPAL_VIP_SECRET;
  const r = await fetch(base+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(id+":"+secret).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
  const j = await r.json();
  if(!r.ok) throw new Error(j.error||"token");
  return j.access_token;
}

// TODO: remplace par ta vraie identité utilisateur (ex: depuis cookie/session).
function currentUserEmailFromEvent(event){
  // si tu stockes l'email en header custom côté front, lis-le ici.
  // À défaut pour démarrer, tu peux passer un header "X-User-Email" côté front (connecté) :
  return (event.headers["x-user-email"] || event.headers["X-User-Email"] || "").toLowerCase().trim();
}

export const handler = async (event) => {
  try{
    if (event.httpMethod !== "POST") return { statusCode:405, body: JSON.stringify({ error:"Méthode non autorisée" }) };
    const { orderID } = JSON.parse(event.body||"{}");
    if (!orderID) return { statusCode:400, body: JSON.stringify({ error:"orderID requis" }) };

    const userEmail = currentUserEmailFromEvent(event);
    if (!userEmail) return { statusCode:401, body: JSON.stringify({ error:"Utilisateur non authentifié" }) };

    const token = await getAccessToken();
    const r = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`,{
      method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }
    });
    const j = await r.json();
    if(!r.ok) return { statusCode:r.status, body: JSON.stringify(j) };

    const capture = j;
    const amount = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || "69.00";

    // Enregistrer / prolonger VIP
    const store = getStore("vip");
    const now = Date.now();

    const prevRaw = await store.get(userEmail);
    let expiresAt = now + 30*24*60*60*1000; // +30 jours
    if (prevRaw){
      try{
        const prev = JSON.parse(prevRaw);
        const prevExp = new Date(prev.expiresAt).getTime() || 0;
        // si déjà actif, on prolonge à partir de la date existante
        expiresAt = (prevExp>now ? prevExp : now) + 30*24*60*60*1000;
      }catch{}
    }
    const doc = { email:userEmail, active:true, amount:Number(amount), currency:"CHF", updatedAt:new Date().toISOString(), expiresAt:new Date(expiresAt).toISOString() };
    await store.set(userEmail, JSON.stringify(doc));

    return { statusCode:200, body: JSON.stringify({ ok:true, vip:doc }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
