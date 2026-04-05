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

let editToken = null; // Replaces uploadToken

// ─── MODE TOGGLE ────────────────────────────────────────────────────────
document.getElementById('mode-toggle').addEventListener('click', () => {
  mode = mode === 'download' ? 'edit' : 'download';
  document.getElementById('mode-toggle').textContent =
    mode === 'download' ? 'Edit Mode' : 'Download Mode';
  
  document.getElementById('download-section').classList.toggle('hidden', mode !== 'download');
  document.getElementById('edit-section').classList.toggle('hidden', mode !== 'edit');

  // Load files automatically if switching to edit mode and already authenticated
  if (mode === 'edit' && editToken) {
    loadFilesForEdit();
  }
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

async function authEdit() {
  const password = document.getElementById('edit-password').value;
  const res = await fetch(`${WORKER_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // We keep type 'upload' here so we don't break your existing Cloudflare worker logic
    body: JSON.stringify({ password, type: 'upload' }) 
  });
  const data = await res.json();
  if (data.token) {
    editToken = data.token;
    document.getElementById('edit-auth').classList.add('hidden');
    document.getElementById('edit-content').classList.remove('hidden');
    loadFilesForEdit(); // Load files immediately so user can delete them
  } else {
    document.getElementById('edit-error').classList.remove('hidden');
  }
}

// ─── EDIT MODE FILE HANDLING ─────────────────────────────────────────────
async function loadFilesForEdit() {
  const res = await fetch(`${WORKER_URL}/api/files`, {
    headers: { 'Authorization': `Bearer ${editToken}` }
  });
  const data = await res.json();
  
  // Safety check: if the worker rejects us, show the error!
  if (data.error) {
    document.getElementById('edit-file-list').innerHTML = `<p style="color:#cc3300">Backend Error: ${data.error}. (Did the worker deploy?)</p>`;
    allFiles = [];
    return;
  }
  
  allFiles = data;
  renderEditFiles();
}

function renderEditFiles() {
  const query = document.getElementById('edit-search').value.toLowerCase();
  const filtered = allFiles.filter(f =>
    f.name.toLowerCase().includes(query) ||
    (f.description || '').toLowerCase().includes(query) ||
    (f.category || '').toLowerCase().includes(query)
  );

  const list = document.getElementById('edit-file-list');
  if (filtered.length === 0) {
    list.innerHTML = '<p>No files found.</p>';
    return;
  }

  // Render file list with red Delete buttons
  list.innerHTML = filtered.map(f => `
    <div class="file-card">
      <div class="file-info">
        <span class="file-name">${f.name}</span>
        ${f.description ? `<span class="file-description">${f.description}</span>` : ''}
        <span class="file-meta">${f.category} · ${formatDate(f.uploaded_at)} · ${formatSize(f.size)}</span>
      </div>
      <button class="form-button" style="color: #cc3300; border-color: #cc3300;" onclick="deleteFile('${f.id}')">Delete</button>
    </div>
  `).join('');
}

async function deleteFile(id) {
  if (!confirm("Are you sure you want to delete this file? This cannot be undone.")) return;

  const res = await fetch(`${WORKER_URL}/api/delete/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${editToken}` }
  });

  const data = await res.json();
  if (data.success) {
    // Remove the file from our local array and re-render the lists
    allFiles = allFiles.filter(f => f.id !== id);
    renderEditFiles();
    if (document.getElementById('search')) renderFiles(); // Keep download list in sync
  } else {
    alert('Failed to delete file.');
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
        <div style="display: flex; flex-direction: column; min-width: 0; overflow: hidden;">
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
    // We must use editToken here now!
    headers: { 'Authorization': `Bearer ${editToken}` },
    body: formData
  });

  const data = await res.json();
  document.getElementById('upload-status').textContent =
    data.success ? 'Uploaded successfully.' : 'Upload failed.';
    
  // Automatically refresh the list so the new file appears to be deleted/viewed
  if (data.success) {
    loadFilesForEdit(); 
  }
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