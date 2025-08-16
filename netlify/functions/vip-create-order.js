import fetch from "node-fetch";

const base = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function getAccessToken(){
  const id = process.env.PAYPAL_VIP_ID;
  const secret = process.env.PAYPAL_VIP_SECRET;
  const r = await fetch(base+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(id+":"+secret).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
  const j = await r.json();
  if(!r.ok) throw new Error(j.error||"token");
  return j.access_token;
}

export const handler = async () => {
  try{
    const token = await getAccessToken();
    const body = {
      intent:"CAPTURE",
      purchase_units:[{
        amount:{ currency_code:"CHF", value:"69.00" },
        description:"VELVET VIP 30 jours",
        custom_id:"vip" // on sait que c'est un VIP
      }],
      application_context:{ brand_name:"Velvet", user_action:"PAY_NOW" }
    };

    const r = await fetch(base+"/v2/checkout/orders",{
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if(!r.ok) return { statusCode:r.status, body: JSON.stringify(j) };
    return { statusCode:200, body: JSON.stringify({ id:j.id }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
