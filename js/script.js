// js/script.js (or wherever you put your JS)
const content = {
  en: { bio: "Physics student at ETH Zurich." },
  de: { bio: "Physikstudent an der ETH Zürich." }
};

function updateLangToggleButton(lang) {
  // when in English show "Deutsch" so user can switch to German, etc.
  document.getElementById("lang-toggle").textContent =
    lang === "en" ? "Deutsch" : "English";
}

function setLang(lang) {
  document.getElementById("bio").textContent = content[lang].bio;
  localStorage.setItem("language", lang);
}

function toggleLanguage() {
  const current = localStorage.getItem("language") || "en";
  const next = current === "en" ? "de" : "en";
  setLang(next);
  updateLangToggleButton(next);
}

document.addEventListener("DOMContentLoaded", () => {
  // 1) mount click handler
  document.getElementById("lang-toggle")
    .addEventListener("click", toggleLanguage);

  // 2) initialize from localStorage (or default to English)
  const saved = localStorage.getItem("language") || "en";
  setLang(saved);
  updateLangToggleButton(saved);
});