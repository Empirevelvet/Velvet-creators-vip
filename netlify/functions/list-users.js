// netlify/functions/list-users.js
// Liste les utilisateurs pour le Dashboard admin
// 1) Essaie @netlify/blobs (store "users")
// 2) Sinon fallback sur Netlify Forms (form name "signup") via NETLIFY_SITE_ID + NETLIFY_API_TOKEN

import { getStore } from "@netlify/blobs";

const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return ok({ error: "Method not allowed" }, 405);
    }

    // petits filtres éventuels (non obligatoires)
    const u = new URL(event.rawUrl || "http://x/");
    const q = (u.searchParams.get("q") || "").trim().toLowerCase();
    const roleFilter = (u.searchParams.get("role") || "").trim().toLowerCase();
    const statusFilter = (u.searchParams.get("status") || "").trim().toLowerCase();

    // 1) Tenter via BLOBS
    let users = await tryReadFromBlobs(q, roleFilter, statusFilter);

    // 2) Fallback via Netlify Forms si aucun utilisateur trouvé
    if (!users.length) {
      const siteId = process.env.NETLIFY_SITE_ID;
      const token  = process.env.NETLIFY_API_TOKEN;
      if (siteId && token) {
        users = await tryReadFromForms(siteId, token, q, roleFilter, statusFilter);
      }
    }

    // Quelques compteurs utiles pour les tuiles du dashboard
    const pending = users.filter((u) => (u.status || "pending") !== "active").length;

    return ok({
      ok: true,
      users,
      counts: {
        total: users.length,
        pending,
      },
    });
  } catch (e) {
    console.error("list-users error:", e);
    return ok({ ok: false, error: "Server error" }, 500);
  }
};

// ---------- Helpers ----------

// Lecture via @netlify/blobs
async function tryReadFromBlobs(q, roleFilter, statusFilter) {
  try {
    const usersStore = getStore("users");
    // Selon la version de @netlify/blobs, list() peut renvoyer
    // un tableau simple ou un objet { blobs: [{ key, ... }] }.
    let keys = [];
    const listed = await usersStore.list?.();
    if (Array.isArray(listed)) {
      keys = listed;
    } else if (listed && Array.isArray(listed.blobs)) {
      keys = listed.blobs.map((b) => b.key);
    } else if (listed && listed.keys && Array.isArray(listed.keys)) {
      keys = listed.keys;
    } else {
      // tentative générique : certains runtimes exposent un itérateur
      try {
        for await (const k of usersStore.list()) keys.push(k.key || k);
      } catch (_) {
        // rien
      }
    }

    const users = [];
    for (const key of keys) {
      try {
        const raw = await usersStore.get(key);
        if (!raw) continue;
        const doc = JSON.parse(raw);
        // normalisation champs
        const user = {
          id: doc.id || key,
          email: doc.email || "",
          username: doc.username || doc.handle || "",
          role: (doc.role || "").toLowerCase() || "client",
          status: (doc.status || "pending").toLowerCase(),
          createdAt: doc.createdAt || doc.created || doc.date || "",
          lastSeenAt: doc.lastSeenAt || doc.lastSeen || "",
        };
        users.push(user);
      } catch (_) {}
    }

    return filterUsers(users, q, roleFilter, statusFilter);
  } catch (e) {
    console.warn("Blobs read failed, fallback:", e.message);
    return [];
  }
}

// Lecture via Netlify Forms API
async function tryReadFromForms(siteId, token, q, roleFilter, statusFilter) {
  const base = `https://api.netlify.com/api/v1`;
  // 1) lister les forms du site
  const formsRes = await fetch(`${base}/sites/${siteId}/forms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!formsRes.ok) return [];
  const forms = await formsRes.json();
  const signup = forms.find((f) => (f.name || "").toLowerCase() === "signup");
  if (!signup) return [];

  // 2) submissions du form "signup"
  const subsRes = await fetch(`${base}/forms/${signup.id}/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!subsRes.ok) return [];
  const subs = await subsRes.json();

  const users = subs.map((s) => {
    const d = s.data || {};
    return {
      id: s.id,
      email: d.email || "",
      username: (d.handle || d.username || "").toString(),
      role: (d.role || "client").toLowerCase(),
      status: "pending", // tant que tu n’as pas validé manuellement
      createdAt: s.created_at || "",
      lastSeenAt: "",
    };
  });

  return filterUsers(users, q, roleFilter, statusFilter);
}

// Filtres communs
function filterUsers(list, q, roleFilter, statusFilter) {
  let out = list;
  if (q) {
    out = out.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
    );
  }
  if (roleFilter && roleFilter !== "tous" && roleFilter !== "all") {
    out = out.filter((u) => (u.role || "").toLowerCase() === roleFilter);
  }
  if (statusFilter && statusFilter !== "tous" && statusFilter !== "all") {
    out = out.filter((u) => (u.status || "").toLowerCase() === statusFilter);
  }
  // tri par date desc si disponible
  out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return out;
}
