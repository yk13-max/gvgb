// Talking to the hosted document at /api/data.
//
// The app is also useful with no backend at all — opened from a file, served as plain
// static files, or run through `npm run dev` without the Netlify CLI. In those cases the
// request comes back as the SPA's own HTML rather than JSON, which is how `absent` is
// told apart from a network that is merely down.
const API = '/api/data';
const PW = 'fufa.tb.pw';

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

async function call(url, init) {
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

// `metaOnly` fetches the revision without the document — a poll costs a few dozen bytes.
export async function getRecord({ metaOnly } = {}) {
  const r = await call(API + (metaOnly ? '?meta=1' : ''));
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
  const r = await call(API, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-tb-password': password || '' },
    body: JSON.stringify({ rev, doc }),
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
  const r = await call(API, { method: 'POST', headers: { 'x-tb-password': password || '' } });
  if (r.kind !== 'json') return r;
  if (r.status === 200) return { kind: 'ok' };
  if (r.status === 401) return { kind: 'unauthorized' };
  if (r.status === 503) return { kind: 'disabled', message: (r.body && r.body.message) || null };
  return { kind: 'error', status: r.status };
}
