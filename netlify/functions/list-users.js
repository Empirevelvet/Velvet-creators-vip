// netlify/functions/list-users.js
// ➜ Retourne la liste des inscrits depuis Netlify Forms (form name = "signup")

exports.handler = async () => {
  try {
    const token  = process.env.NETLIFY_API_TOKEN; // à définir dans Netlify → Site settings → Environment
    const siteId = process.env.NETLIFY_SITE_ID;   // idem
    if (!token || !siteId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing NETLIFY_API_TOKEN or NETLIFY_SITE_ID' }) };
    }

    // 1) Lister les forms du site, trouver "signup"
    const formsResp = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!formsResp.ok) throw new Error('forms list failed');
    const forms = await formsResp.json();
    const signupForm = forms.find(f => (f.name||'').toLowerCase() === 'signup');
    if (!signupForm) {
      return { statusCode: 200, body: JSON.stringify({ users: [], note: "No 'signup' form found" }) };
    }

    // 2) Charger les submissions (inscriptions) de ce form
    const subsResp = await fetch(`https://api.netlify.com/api/v1/forms/${signupForm.id}/submissions?per_page=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!subsResp.ok) throw new Error('submissions failed');
    const subs = await subsResp.json();

    // 3) Mapper vers un format unifié pour ton admin-users.html
    const users = subs.map(s => {
      const d = s.data || {};
      const username = (d.handle || d.pseudo || '').trim();
      const role     = (d.role   || 'client').trim();
      const email    = (d.email  || '').trim();
      return {
        id:           s.id,
        username:     username || '(inconnu)',
        email:        email || '(sans email)',
        role,
        status:       'pending',                 // par défaut en attente
        createdAt:    s.created_at || s.createdAt,
        lastSeen:     s.created_at || s.createdAt,
        fullname:     d.fullname || '',
        phone:        d.phone || '',
        country:      d.country || '',
        dob:          d.dob || ''
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: 'list-users failed' }) };
  }
};
