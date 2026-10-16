// Talking to the hosted document at /api/data.
//
// The app is also useful with no backend at all — opened from a file, served as plain
// static files, or run through `npm run dev` without the Netlify CLI. In those cases the
// request comes back as the SPA's own HTML rather than JSON, which is how `absent` is
// told apart from a network that is merely down.
// Where the function answers. A Netlify function with a custom path is served there and
// not at the default /.netlify/functions/<name>; without one it is the other way round.
// Rather than depend on which, try the tidy path first and remember whichever replies.
const ENDPOINTS = ['/api/data', '/.netlify/functions/data'];
const PW = 'fufa.tb.pw';
const NAME = 'fufa.tb.name';

let endpoint = null;

export function savedPassword() {
  try {
    return localStorage.getItem(PW) || '';
  } catch {
    return '';
  }
}

export function storePassword(pw) {
  try {
    if (pw) localStorage.setItem(PW, pw);
    else localStorage.removeItem(PW);
  } catch {
    // Without storage the password simply has to be entered again next time.
  }
}

// Who is editing from this device, for the change log. Everyone shares one password, so
// the name is the only way the log can say who did what; it is asked for once per device.
export function savedName() {
  try {
    return localStorage.getItem(NAME) || '';
  } catch {
    return '';
  }
}

export function storeName(name) {
  try {
    if (name && name.trim()) localStorage.setItem(NAME, name.trim().slice(0, 40));
    else localStorage.removeItem(NAME);
  } catch {
    // Without storage the log just says "Someone".
  }
}

async function send(url, init) {
  let res;
  try {
    res = await fetch(url, { cache: 'no-store', ...init });
  } catch {
    return { kind: 'offline' };
  }
  if (res.status === 404) return { kind: 'absent' };
  if (!(res.headers.get('content-type') || '').includes('application/json')) return { kind: 'absent' };
  try {
    return { kind: 'json', status: res.status, body: await res.json() };
  } catch {
    return { kind: 'absent' };
  }
}

// `absent` means nothing happened at the other end — no function, or the SPA's own HTML
// came back — so moving on to the next spelling is safe even for a write. Anything that
// answers in JSON is the real endpoint, whatever its status code, and is kept.
const ruledOut = new Set();

async function call(query, init) {
  if (endpoint) return send(endpoint + query, init);
  let last = { kind: 'absent' };
  for (const path of ENDPOINTS) {
    // Once a spelling has been shown to be dead, stop asking it. Two requests already in
    // flight together will still both probe — worth one spare request on a page load, not
    // worth serialising every call behind a discovery step.
    if (ruledOut.has(path)) continue;
    const r = await send(path + query, init);
    if (r.kind === 'json') {
      endpoint = path;
      return r;
    }
    if (r.kind === 'offline') return r;
    ruledOut.add(path);
    last = r;
  }
  return last;
}

// `metaOnly` fetches the revision without the document — a poll costs a few dozen bytes.
export async function getRecord({ metaOnly } = {}) {
  const r = await call(metaOnly ? '?meta=1' : '');
  if (r.kind !== 'json') return r;
  if (r.status !== 200) return { kind: 'error', status: r.status, message: (r.body && r.body.message) || null };
  return {
    kind: 'record',
    rev: Number(r.body.rev) || 0,
    updatedAt: r.body.updatedAt || null,
    doc: r.body.doc || null,
  };
}

export async function putRecord({ rev, doc, password }) {
  const r = await call('', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-tb-password': password || '' },
    body: JSON.stringify({ rev, doc, by: savedName() }),
  });
  if (r.kind !== 'json') return r;
  const b = r.body || {};
  if (r.status === 200) return { kind: 'saved', rev: Number(b.rev) || 0, updatedAt: b.updatedAt || null };
  if (r.status === 401) return { kind: 'unauthorized' };
  if (r.status === 409) {
    return { kind: 'conflict', rev: Number(b.rev) || 0, updatedAt: b.updatedAt || null, doc: b.doc || null };
  }
  if (r.status === 503) return { kind: 'disabled', message: b.message || null };
  return { kind: 'error', status: r.status, message: b.message || null };
}

// Checks a password without writing anything, so signing in can fail cleanly.
export async function checkPassword(password) {
  const r = await call('', { method: 'POST', headers: { 'x-tb-password': password || '' } });
  if (r.kind !== 'json') return r;
  if (r.status === 200) return { kind: 'ok' };
  if (r.status === 401) return { kind: 'unauthorized' };
  if (r.status === 503) return { kind: 'disabled', message: (r.body && r.body.message) || null };
  return { kind: 'error', status: r.status };
}

// --- housekeeping: the change log and backups (password holders only) -----------------

const auth = (password) => ({ 'x-tb-password': password || '' });
const failed = (r) => (r.kind !== 'json' ? r : r.status === 401 ? { kind: 'unauthorized' } : { kind: 'error', status: r.status, message: (r.body && r.body.message) || null });

export async function getLog(password, limit = 100) {
  const r = await call('?log=1&limit=' + limit, { headers: auth(password) });
  if (r.kind !== 'json' || r.status !== 200) return failed(r);
  return { kind: 'log', entries: (r.body && r.body.entries) || [] };
}

export async function getBackups(password) {
  const r = await call('?backups=1', { headers: auth(password) });
  if (r.kind !== 'json' || r.status !== 200) return failed(r);
  return { kind: 'backups', list: (r.body && r.body.list) || [] };
}

export async function backupNow(password) {
  const r = await call('?backup=now', { method: 'POST', headers: { ...auth(password), 'content-type': 'application/json' }, body: JSON.stringify({ by: savedName() }) });
  if (r.kind !== 'json' || r.status !== 200) return failed(r);
  return { kind: 'ok', backup: r.body.backup };
}

export async function restoreBackup(password, id, rev) {
  const r = await call('?restore=' + encodeURIComponent(id), {
    method: 'POST',
    headers: { ...auth(password), 'content-type': 'application/json' },
    body: JSON.stringify({ rev, by: savedName() }),
  });
  if (r.kind !== 'json') return r;
  if (r.status === 200) return { kind: 'restored', rev: Number(r.body.rev) || 0, updatedAt: r.body.updatedAt || null, doc: r.body.doc || null };
  if (r.status === 409) return { kind: 'conflict' };
  return failed(r);
}
