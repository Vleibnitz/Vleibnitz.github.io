

const content = {
  en: {
    bio: "Physics student at ETH Zurich.",

  },
  de: {
    bio: "Physikstudent an der ETH Zürich.",
  
  }
};

function updateLangToggleButton(lang) {
  const btn = document.getElementById("lang-toggle");
  btn.textContent = lang === "en" ? "Deutsch" : "English";
}

function setLang(lang) {
  document.getElementById("bio").textContent = content[lang].bio;
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
  // Automatic dark-mode detection
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) {
    document.documentElement.setAttribute("data-theme", storedTheme);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }

  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const currentLang = localStorage.getItem("language") || "en";
      const nextLang = currentLang === "en" ? "de" : "en";
      setLang(nextLang);
      updateLangToggleButton(nextLang);
    });
  }

  const savedLang = localStorage.getItem("language") || "en";
  setLang(savedLang);
  if (document.getElementById("lang-toggle")) {
    updateLangToggleButton(savedLang);
  }
});
