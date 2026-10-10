// The hosted document. GET is open to anyone with the link; writing needs the shared
// password, set as TB_PASSWORD in the site's environment variables.
//
// Storage is Netlify Blobs, which every Netlify site has — nothing to provision. Reads
// are strongly consistent so a save never checks itself against a stale revision.
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

const STORE = 'fufa-team-balancer';
const KEY = 'doc';
const MAX_BYTES = 2 * 1024 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Digests first so both sides are always 32 bytes: timingSafeEqual throws on a length
// mismatch, and throwing on the wrong length would itself leak the length.
const digest = (s) => createHash('sha256').update(String(s == null ? '' : s), 'utf8').digest();
const sameSecret = (a, b) => timingSafeEqual(digest(a), digest(b));

async function authorise(req) {
  const secret = process.env.TB_PASSWORD;
  if (!secret) {
    return json(
      { error: 'no-password-set', message: 'TB_PASSWORD is not set on this site, so saving is turned off.' },
      503
    );
  }
  if (!sameSecret(req.headers.get('x-tb-password'), secret)) {
    // Blunt the rate at which a password can be guessed. Netlify counts function time,
    // so this stays short rather than being a real lockout.
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: 'unauthorized' }, 401);
  }
  return null;
}

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });

  if (req.method === 'GET') {
    const rec = await store.get(KEY, { type: 'json' });
    const meta = new URL(req.url).searchParams.get('meta');
    if (!rec) return json({ rev: 0, updatedAt: null, doc: null });
    return json(meta ? { rev: rec.rev, updatedAt: rec.updatedAt } : rec);
  }

  // A password check that writes nothing, so signing in can fail without touching the data.
  if (req.method === 'POST') {
    const denied = await authorise(req);
    return denied || json({ ok: true });
  }

  if (req.method === 'PUT') {
    const denied = await authorise(req);
    if (denied) return denied;

    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: 'too-large' }, 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: 'bad-json' }, 400);
    }
    const doc = body && body.doc;
    if (!doc || typeof doc !== 'object' || !Array.isArray(doc.players) || !doc.players.length) {
      return json({ error: 'bad-doc', message: 'A document needs a non-empty players list.' }, 400);
    }

    const current = await store.get(KEY, { type: 'json' });
    const rev = current ? Number(current.rev) || 0 : 0;
    // Somebody else saved since this client last read. Hand back what is actually stored
    // so the app can show the choice rather than silently overwriting their night's work.
    if (Number(body.rev) !== rev) {
      return json(
        { error: 'conflict', rev, updatedAt: current ? current.updatedAt : null, doc: current ? current.doc : null },
        409
      );
    }

    const next = { rev: rev + 1, updatedAt: new Date().toISOString(), doc };
    await store.setJSON(KEY, next);
    return json({ rev: next.rev, updatedAt: next.updatedAt });
  }

  return json({ error: 'method-not-allowed' }, 405);
};

export const config = { path: '/api/data' };
