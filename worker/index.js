const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/auth' && request.method === 'POST') {
      return handleAuth(request, env);
    }
    if (path === '/api/files' && request.method === 'GET') {
      return handleList(request, env);
    }
    if (path === '/api/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }
    if (path.startsWith('/api/download/') && request.method === 'GET') {
      return handleDownload(request, env, path);
    }

    return new Response('Not found', { status: 404 });
  }
};

// ─── AUTH ────────────────────────────────────────────────────────────────────

async function handleAuth(request, env) {
  const { password, type } = await request.json();
    //down or up
  const key = type + '_password_hash';
  const row = await env.DB.prepare(
    'SELECT value FROM config WHERE key = ?'
  ).bind(key).first();

  if (!row) return json({ error: 'Invalid type' }, 400);

  const hash = await sha256(password);

  if (hash !== row.value) {
    return json({ error: 'Wrong password' }, 401);
  }

  const token = await makeToken(type, env.TOKEN_SECRET);
  return json({ token });
}

// ─── LIST FILES ───────────────────────────────────────────────────────────────

async function handleList(request, env) {
  const auth = await verifyToken(request, 'download', env.TOKEN_SECRET);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const { results } = await env.DB.prepare(
    'SELECT * FROM files ORDER BY uploaded_at DESC'
  ).all();

  return json(results);
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

async function handleUpload(request, env) {
  const auth = await verifyToken(request, 'upload', env.TOKEN_SECRET);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const formData = await request.formData();
  const file = formData.get('file');
  const description = formData.get('description') || '';
  const category = formData.get('category') || 'misc';

  if (!file) return json({ error: 'No file provided' }, 400);

  const id = crypto.randomUUID();
  const key = id + '/' + file.name;

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  await env.DB.prepare(
    'INSERT INTO files (id, name, description, category, size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, file.name, description, category, file.size, new Date().toISOString()).run();

  return json({ success: true, id });
}

// ─── DOWNLOAD ─────────────────────────────────────────────────────────────────

async function handleDownload(request, env, path) {
  const auth = await verifyToken(request, 'download', env.TOKEN_SECRET);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const id = path.replace('/api/download/', '');
  const row = await env.DB.prepare(
    'SELECT * FROM files WHERE id = ?'
  ).bind(id).first();

  if (!row) return json({ error: 'File not found' }, 404);

  const key = id + '/' + row.name;
  const object = await env.BUCKET.get(key);

  if (!object) return json({ error: 'File not found in storage' }, 404);

  return new Response(object.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${row.name}"`,
    }
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function makeToken(type, secret) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8; // 8 hours
  const payload = `${type}.${expires}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${payload}.${sigHex}`;
}

async function verifyToken(request, requiredType, secret) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [type, expires, sig] = parts;
  if (type !== requiredType) return false;
  if (parseInt(expires) < Math.floor(Date.now() / 1000)) return false;

  const payload = `${type}.${expires}`;
  const key = await importKey(secret);
  const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedSigHex = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return sig === expectedSigHex;
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}