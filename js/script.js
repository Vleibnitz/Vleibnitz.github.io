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
    bio:        "Student at ETH Zurich.",
    emailLabel: "Email",
    email:      "vitus@leibni.tz"
  },
  de: {
    bio:        "Student an der ETH Zürich.",
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
const WORKER_URL = 'https://my-site-worker.hbwtdjmzz8.workers.dev';

let downloadToken = null;
let uploadToken = null;
let allFiles = [];
let mode = 'download';

// ─── TOUCH DETECTION ────────────────────────────────────────────────────
(function() {
  if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
    document.documentElement.classList.add('touch');
  }
})();

// ─── MODE TOGGLE ────────────────────────────────────────────────────────
document.getElementById('mode-toggle').addEventListener('click', () => {
  mode = mode === 'download' ? 'upload' : 'download';
  document.getElementById('mode-toggle').textContent =
    mode === 'download' ? 'Upload Mode' : 'Download Mode';
  document.getElementById('download-section').classList.toggle('hidden', mode !== 'download');
  document.getElementById('upload-section').classList.toggle('hidden', mode !== 'upload');
});

// ─── AUTH ────────────────────────────────────────────────────────────────
async function authDownload() {
  const password = document.getElementById('download-password').value;
  const res = await fetch(`${WORKER_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, type: 'download' })
  });
  const data = await res.json();
  if (data.token) {
    downloadToken = data.token;
    document.getElementById('download-auth').classList.add('hidden');
    document.getElementById('download-content').classList.remove('hidden');
    loadFiles();
  } else {
    document.getElementById('download-error').classList.remove('hidden');
  }
}

async function authUpload() {
  const password = document.getElementById('upload-password').value;
  const res = await fetch(`${WORKER_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, type: 'upload' })
  });
  const data = await res.json();
  if (data.token) {
    uploadToken = data.token;
    document.getElementById('upload-auth').classList.add('hidden');
    document.getElementById('upload-content').classList.remove('hidden');
  } else {
    document.getElementById('upload-error').classList.remove('hidden');
  }
}

// ─── LOAD FILES ──────────────────────────────────────────────────────────
async function loadFiles() {
  const res = await fetch(`${WORKER_URL}/api/files`, {
    headers: { 'Authorization': `Bearer ${downloadToken}` }
  });
  allFiles = await res.json();
  renderFiles();
}

// ─── RENDER ──────────────────────────────────────────────────────────────
function renderFiles() {
  const query = document.getElementById('search').value.toLowerCase();
  const filtered = allFiles.filter(f =>
    f.name.toLowerCase().includes(query) ||
    (f.description || '').toLowerCase().includes(query) ||
    (f.category || '').toLowerCase().includes(query)
  );

  const list = document.getElementById('file-list');
  if (filtered.length === 0) {
    list.innerHTML = '<p>No files found.</p>';
    return;
  }

 list.innerHTML = filtered.map(f => `
    <div class="file-card">
      <div class="file-info" style="flex-direction: row; align-items: center; gap: 1rem;">
        <input type="checkbox" class="file-checkbox" data-id="${f.id}" data-name="${f.name}" style="transform: scale(1.2); cursor: pointer;">
        <div style="display: flex; flex-direction: column;">
          <span class="file-name">${f.name}</span>
          ${f.description ? `<span class="file-description">${f.description}</span>` : ''}
          <span class="file-meta">${f.category} · ${formatDate(f.uploaded_at)} · ${formatSize(f.size)}</span>
        </div>
      </div>
      <button class="form-button" onclick="downloadFile('${f.id}', '${f.name}')">Download</button>
    </div>
  `).join('');
 }
// ─── DOWNLOAD FILE ───────────────────────────────────────────────────────
async function downloadFile(id, name) {
  const res = await fetch(`${WORKER_URL}/api/download/${id}`, {
    headers: { 'Authorization': `Bearer ${downloadToken}` }
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── UPLOAD FILE ─────────────────────────────────────────────────────────
async function uploadFile() {
  const file = document.getElementById('file-input').files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('description', document.getElementById('upload-description').value);
  formData.append('category', document.getElementById('upload-category').value);

  document.getElementById('upload-status').textContent = 'Uploading...';

  const res = await fetch(`${WORKER_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${uploadToken}` },
    body: formData
  });

  const data = await res.json();
  document.getElementById('upload-status').textContent =
    data.success ? 'Uploaded successfully.' : 'Upload failed.';
}

// ─── HELPERS ─────────────────────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString();
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── ENTER KEY ───────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (mode === 'download') authDownload();
  else authUpload();
});




// ─── BULK DOWNLOAD LOGIC ──────────────────────────────────────────────────
function selectAll() {
  const checkboxes = document.querySelectorAll('.file-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
}

async function downloadSelected() {
  const checkboxes = document.querySelectorAll('.file-checkbox:checked');

  if (checkboxes.length === 0) {
    alert("Please select at least one file.");
    return;
  }

  const btn = document.getElementById('bulk-download-btn');
  const originalText = btn.textContent;
  btn.textContent = "Zipping files...";
  btn.disabled = true;

  try {
    const zip = new JSZip();

    for (const cb of checkboxes) {
      const id = cb.getAttribute('data-id');
      const name = cb.getAttribute('data-name');

      const res = await fetch(`${WORKER_URL}/api/download/${id}`, {
        headers: { 'Authorization': `Bearer ${downloadToken}` }
      });
      const blob = await res.blob();
      zip.file(name, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "files.zip";
    a.click();
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Bulk download failed:", error);
    alert("An error occurred while zipping the files.");
  }

  btn.textContent = originalText;
  btn.disabled = false;
}