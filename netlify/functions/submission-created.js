// netlify/functions/submission-created.js
// Copie chaque soumission Netlify Forms (creator-application) dans les blobs "users"
// + index "by_username" pour bloquer les doublons

import { getStore } from '@netlify/blobs';

/** Utilitaire pour réponse JSON */
const ok = (body, status = 200) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    // Netlify envoie { payload: {...} } pour les events de formulaire
    const { payload } = JSON.parse(event.body || '{}');
    if (!payload) return ok({ error: 'No payload' }, 400);

    // On ne traite que le formulaire "creator-application"
    if (payload.form_name !== 'creator-application') {
      return ok({ skip: true });
    }

    // Champs saisis
    const data = payload.data || {};
    const email = String(data.email || '').trim();
    const usernameClean = String(data.username || '').trim();
    const usernameNorm = usernameClean.toLowerCase();

    if (!email || !usernameClean) {
      return ok({ error: 'Champs manquants' }, 400);
    }

    // Stores
    const users = getStore('users');
    const byUsername = getStore('by_username');

    // Doublons
    const emailNorm = email.toLowerCase();
    const existingByEmail = await users.get(emailNorm);
    if (existingByEmail) return ok({ error: 'Email déjà utilisé' }, 409);

    const existingEmailForUsername = await byUsername.get(usernameNorm);
    if (existingEmailForUsername) return ok({ error: 'Pseudo déjà pris' }, 409);

    // Fichiers (Netlify Forms fournit des liens dans le payload)
    // Suivant la config, tu peux trouver data.avatar, data.id_front, etc.
    // On stocke les noms/URLs si présents, sinon vide.
    const files = {
      avatar: data.avatar || '',
      idFront: data.id_front || '',
      idBack: data.id_back || '',
      selfie: data.selfie || '',
    };

    // Document utilisateur
    const now = new Date().toISOString();
    const uid = 'user_' + Date.now();

    const userDoc = {
      id: uid,
      email: emailNorm,
      username: usernameClean,
      usernameLower: usernameNorm,
      createdAt: now,
      status: 'pending', // en attente de validation
      role: data.role === 'client' ? 'client' : 'creator',
      profile: {
        fullname: data.fullname || '',
        phone: data.phone || '',
        address: data.address || '',
        country: data.country || '',
        dob: data.dob || '',
      },
      files,
      // (Optionnel) garde une trace brute de la soumission
      form: {
        submission_id: payload.id,
        site_url: payload.site_url,
      },
    };

    // Sauvegarde atomique : index d’abord, puis fiche user
    await byUsername.set(usernameNorm, emailNorm);
    await users.set(emailNorm, JSON.stringify(userDoc));

    return ok({ ok: true, id: uid });
  } catch (err) {
    console.error('submission-created error', err);
    return ok({ error: 'Server error' }, 500);
  }
};
