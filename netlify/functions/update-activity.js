// netlify/functions/update-activity.js
import { getStore } from "@netlify/blobs";

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return ok({ error: "POST uniquement" }, 405);
    const { email } = JSON.parse(event.body || "{}");
    if (!email) return ok({ error: "email manquant" }, 400);

    const users = getStore("users");
    const key = String(email).trim().toLowerCase();
    const raw = await users.get(key);
    if (!raw) return ok({ error: "compte introuvable" }, 404);

    const u = JSON.parse(raw);
    u.lastActive = new Date().toISOString();
    u.updatedAt  = u.lastActive;
    await users.set(key, JSON.stringify(u));

    return ok({ success: true, lastActive: u.lastActive });
  } catch (e) {
    console.error(e);
    return ok({ success: false, error: e.message }, 500);
  }
};
