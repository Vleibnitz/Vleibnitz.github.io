// script.js

// ─── TOUCH DETECTION ──────────────────────────────────────────────────────────
// add a class so touch devices never get hover styles
(function() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) {
    document.documentElement.classList.add('touch');
  }
})();

const content = {
  en: {
    bio:        "Physics student at ETH Zurich.",
    emailLabel: "Email",
    email:      "vitus@leibni.tz"
  },
  de: {
    bio:        "Physikstudent an der ETH Zürich.",
    emailLabel: "E-Mail",
    email:      "vitus@leibni.tz"
  }
};

function updateLangToggleButton(lang) {
  document.getElementById("lang-toggle").textContent =
    lang === "en" ? "Deutsch" : "English";
}

function setLang(lang) {
  const data = content[lang];
  document.getElementById("bio").textContent = data.bio;
  const emailLink = document.getElementById("email-link");
  emailLink.textContent = data.emailLabel;
  emailLink.href        = `mailto:${data.email}`;
  localStorage.setItem("language", lang);
}

function toggleLanguage() {
  const current = localStorage.getItem("language") || "en";
  const next    = current === "en" ? "de" : "en";
  setLang(next);
  updateLangToggleButton(next);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("lang-toggle")
          .addEventListener("click", toggleLanguage);

  const saved = localStorage.getItem("language") || "en";
  setLang(saved);
  updateLangToggleButton(saved);
});
