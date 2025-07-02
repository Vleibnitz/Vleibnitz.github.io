const content = {
  en: {
    bio: "Physics student at ETH Zurich.",

  },
  de: {
    bio: "Physikstudent an der ETH Zürich.",
  
  }
};

function setLang(lang) {
  document.getElementById("bio").textContent = content[lang].bio;
  document.getElementById("contactLabel").textContent = content[lang].contact;
  localStorage.setItem("language", lang);
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

document.addEventListener("DOMContentLoaded", () => {
  // wire up language buttons
  document.querySelectorAll(".lang-switch").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
  // wire up theme toggle
  document.querySelector(".theme-switch")
          .addEventListener("click", toggleTheme);

  // load saved prefs
  const savedLang = localStorage.getItem("language") || "en";
  const savedTheme = localStorage.getItem("theme") || "light";
  setLang(savedLang);
  document.documentElement.setAttribute("data-theme", savedTheme);
});
