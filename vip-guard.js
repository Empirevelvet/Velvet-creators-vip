// vip-guard.js
// Script unique pour gérer la sécurité et l'affichage VIP

const VIPGuard = {
  // Vérifie si l'utilisateur est VIP
  isVip: function () {
    let user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role === "vip";
  },

  // Redirige automatiquement si pas VIP
  ensureVipOrRedirect: function () {
    if (!this.isVip()) {
      alert("⛔ Accès réservé aux membres VIP !");
      window.location.href = "/login.html"; // redirection si non VIP
    }
  },

  // Protège une section spécifique (par ex. un bloc VIP)
  protectSection: function (selector) {
    if (!this.isVip()) {
      let el = document.querySelector(selector);
      if (el) {
        el.innerHTML = "<p style='color:red;'>⛔ Contenu réservé aux VIP.</p>";
      }
    }
  },

  // Ajoute un badge VIP automatiquement sur un élément
  decorateVipBadge: function (selector) {
    if (this.isVip()) {
      let el = document.querySelector(selector);
      if (el) {
        el.innerHTML +=
          " <span style='color: gold; font-weight: bold;'>(VIP✔)</span>";
      }
    }
  }
};
