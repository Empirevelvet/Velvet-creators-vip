// netlify/functions/submission-created.js
const fs = require('fs');
const path = require('path');

const DB = (p) => path.join(__dirname, '..', '..', 'data', p);
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(DB(name), 'utf8')); }
  catch { return fallback; }
}
function writeJSON(name, data) {
  fs.mkdirSync(path.dirname(DB(name)), { recursive: true });
  fs.writeFileSync(DB(name), JSON.stringify(data, null, 2));
}

exports.handler = async (event) => {
  try {
    // Payload envoyé par Netlify Forms
    const body = JSON.parse(event.body || '{}');
    const { payload } = body || {};
    if (!payload || !payload.data) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'no payload' }) };
    }

    // On ne traite que le formulaire "signup"
    const formName = payload.form_name || payload.formName || '';
    if (String(formName).toLowerCase() !== 'signup') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'ignored form' }) };
    }

    const d = payload.data || {};
    // Champs attendus depuis ton <form name="signup"> :
    // handle, fullname, email, phone, address, role (creatrice|client), country, dob ...
    const username = d.handle ? String(d.handle).trim() : '';
    const email    = d.email  ? String(d.email).trim()  : '';
    const role     = d.role   ? String(d.role).trim()   : 'client';

    if (!username || !email) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, note: 'missing username/email' }) };
    }

    const users = readJSON('users.json', []);
    // Anti‑doublon (email ou username)
    const exists = users.find(u => (u.email||'').toLowerCase()===email.toLowerCase() ||
                                   (u.username||'').toLowerCase()===username.toLowerCase());
    if (exists) {
      // On ne double pas — on peut aussi mettre à jour des champs si besoin
      return { statusCode: 200, body: JSON.stringify({ ok: true, note: 'already exists' }) };
    }

    const nowIso = new Date().toISOString();
    const user = {
      id: 'u_' + Date.now().toString(36),
      username,
      email,
      role,               // "creatrice" ou "client"
      status: 'pending',  // à valider manuellement dans admin-users.html
      createdAt: nowIso,
      lastSeen: nowIso,
      // En bonus tu peux stocker d’autres champs (non affichés) :
      fullname: d.fullname || '',
      phone: d.phone || '',
      address: d.address || '',
      country: d.country || '',
      dob: d.dob || ''
    };

    users.push(user);
    writeJSON('users.json', users);

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: user.id }) };
  } catch (e) {
    console.error('submission-created error', e);
    return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  }
};
