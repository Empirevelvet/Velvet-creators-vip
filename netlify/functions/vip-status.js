import { getStore } from "@netlify/blobs";

function currentUserEmailFromEvent(event){
  return (event.headers["x-user-email"] || event.headers["X-User-Email"] || "").toLowerCase().trim();
}

export const handler = async (event) => {
  try{
    const email = currentUserEmailFromEvent(event);
    if (!email) return { statusCode:200, body: JSON.stringify({ active:false }) }; // pas connecté => non VIP

    const store = getStore("vip");
    const raw = await store.get(email);
    if (!raw) return { statusCode:200, body: JSON.stringify({ active:false }) };

    const doc = JSON.parse(raw);
    const now = Date.now();
    const exp = new Date(doc.expiresAt).getTime() || 0;
    const active = exp > now;

    return { statusCode:200, body: JSON.stringify({ active, expiresAt:doc.expiresAt }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
