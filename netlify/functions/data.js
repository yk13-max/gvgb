// The hosted document. GET is open to anyone with the link; writing needs the shared
// password, set as TB_PASSWORD in the site's environment variables.
//
// Storage is Netlify Blobs, which every Netlify site has — nothing to provision. Reads
// are strongly consistent so a save never checks itself against a stale revision.
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { FORMATS, cleanFormula, formulasOf } from '../../src/lib/formula.js';

// Every format but 6-a-side keeps its formula under its own key (see docKeyFor).
const OTHERS = FORMATS.filter((n) => n !== 6);

const STORE = 'fufa-team-balancer';
const KEY = 'doc';
const LOG = 'log'; // { entries: [{ rev, at, by, changes: [string] }] }, newest first
const BACKUPS = 'backups'; // { list: [{ id, at, by, reason, rev, players, weeks }] }, newest first
const MAX_BYTES = 2 * 1024 * 1024;
const LOG_MAX = 300;
const BACKUP_MAX = 12;
const WEEK_MS = 7 * 24 * 3600 * 1000;

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

// The team formula sits behind a second code, TB_FORMULA_PASSWORD, on top of the group's
// password. A short numeric code is easy to guess one try at a time, so wrong tries are
// counted: ten in fifteen minutes and it stops answering until the window has passed.
const FAILS = 'formula-fails';
const FAIL_WINDOW = 15 * 60 * 1000;
const FAIL_MAX = 10;

async function formulaDenied(req, store) {
  const secret = process.env.TB_FORMULA_PASSWORD;
  if (!secret) {
    return json({ error: 'no-formula-password', message: 'TB_FORMULA_PASSWORD is not set on this site, so the team formula is locked.' }, 403);
  }
  const now = Date.now();
  const fails = ((await store.get(FAILS, { type: 'json' })) || { at: [] }).at.filter((t) => now - t < FAIL_WINDOW);
  if (fails.length >= FAIL_MAX) {
    return json({ error: 'formula-throttled', message: 'Too many wrong codes. Try again in 15 minutes.' }, 429);
  }
  if (!sameSecret(req.headers.get('x-tb-formula'), secret)) {
    await store.setJSON(FAILS, { at: [...fails, now] });
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: 'formula-unauthorized', message: 'That code was not accepted.' }, 403);
  }
  return null;
}

// Two formulas compared by what they do: a missing one is the default, and who saved it
// doesn't count.
const formulaKey = (f) => {
  const { meta, ...rest } = cleanFormula(f);
  return JSON.stringify(rest);
};
const prevKey = (f) => (f ? formulaKey(f) : null);
const bare5 = (f) => {
  const { meta, ...rest } = f;
  return rest;
};


// --- change summaries -------------------------------------------------------------------
// Worked out here, from the stored document and the incoming one, so the log says what
// actually changed whoever sent it. Dates stay ISO; the app formats them for reading.

const byId = (list) => new Map((Array.isArray(list) ? list : []).map((x) => [x && x.id, x]));
const names = (list, max = 3) => (list.length <= max ? list.join(', ') : list.slice(0, max).join(', ') + ' and ' + (list.length - max) + ' more');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function summarise(before, after) {
  const out = [];
  if (!before) return ['Created the shared data'];
  const bp = byId(before.players);
  const ap = byId(after.players);
  const added = [...ap.values()].filter((p) => !bp.has(p.id)).map((p) => p.name);
  const removed = [...bp.values()].filter((p) => !ap.has(p.id)).map((p) => p.name);
  if (added.length) out.push('Added ' + names(added));
  if (removed.length) out.push('Removed ' + names(removed));
  const renamed = [];
  const rated = [];
  const moved = [];
  const clubs = [];
  ap.forEach((p, id) => {
    const o = bp.get(id);
    if (!o) return;
    if (o.name !== p.name) renamed.push(o.name + ' → ' + p.name);
    if (!same(o.stats, p.stats)) rated.push(p.name);
    if (o.pos !== p.pos || !same(o.alt, p.alt)) moved.push(p.name);
    if ((o.club || null) !== (p.club || null)) clubs.push(p.name);
  });
  if (renamed.length) out.push('Renamed ' + names(renamed));
  if (rated.length) out.push('Changed ratings for ' + names(rated));
  if (moved.length) out.push('Changed positions for ' + names(moved));
  if (clubs.length) out.push('Changed supported side for ' + names(clubs));

  const bw = new Map((before.history || []).map((w) => [w.date, w]));
  const aw = new Map((after.history || []).map((w) => [w.date, w]));
  aw.forEach((w, date) => {
    const o = bw.get(date);
    if (!o) {
      out.push('Recorded ' + (w.matches || []).length + ' match' + ((w.matches || []).length === 1 ? '' : 'es') + ' on ' + date);
      return;
    }
    const om = byId(o.matches);
    const nm = byId(w.matches);
    const addedM = [...nm.keys()].filter((id) => !om.has(id)).length;
    const removedM = [...om.keys()].filter((id) => !nm.has(id)).length;
    const edited = [...nm.keys()].filter((id) => om.has(id) && !same(om.get(id), nm.get(id))).length;
    if (addedM) out.push('Added ' + addedM + ' match' + (addedM === 1 ? '' : 'es') + ' on ' + date);
    if (removedM) out.push('Removed ' + removedM + ' match' + (removedM === 1 ? '' : 'es') + ' on ' + date);
    if (edited) out.push('Edited ' + edited + ' match' + (edited === 1 ? '' : 'es') + ' on ' + date);
    if (!same(o.awards, w.awards)) out.push('Changed nominations for ' + date);
  });
  bw.forEach((w, date) => {
    if (!aw.has(date)) out.push('Deleted the night of ' + date);
  });

  const bs = byId(before.seasons);
  const as = byId(after.seasons);
  as.forEach((s, id) => {
    const o = bs.get(id);
    if (!o) out.push('Added season ' + s.name);
    else {
      if (o.name !== s.name || o.start !== s.start) out.push('Edited season ' + s.name);
      if (!o.completed && s.completed) out.push('Completed season ' + s.name);
      if (o.completed && !s.completed) out.push('Reopened season ' + s.name);
      if ((o.minGames || 0) !== (s.minGames || 0)) out.push((s.minGames ? 'Set ' + s.minGames + ' matches' : 'Removed the minimum matches') + ' to place in ' + s.name);
      if (!same(o.honours, s.honours)) out.push('Named honours for ' + s.name);
    }
  });
  bs.forEach((s, id) => {
    if (!as.has(id)) out.push('Removed season ' + s.name);
  });

  if (!same(before.selected, after.selected)) {
    const n = (after.selected || []).length;
    out.push('Picked the squad (' + n + ' player' + (n === 1 ? '' : 's') + ')');
  }
  if (!same(before.board, after.board)) out.push((after.board && after.board.red && after.board.red.length ? 'Changed the board' : 'Cleared the board'));
  if (before.teamSize !== after.teamSize) out.push('Switched to ' + after.teamSize + '-a-side');
  if (!same(before.match, after.match)) out.push('Updated the fixture details');
  // The formula's own note says why; who saved it is already on the entry.
  const bare = (f) => {
    if (!f || typeof f !== 'object') return null;
    const { meta, ...rest } = f;
    return rest;
  };
  // A document from before formulas were stored picks up the default on its next save;
  // that is not a change anyone made.
  const had = before.formula || (after.formula && after.formula.meta);
  if (had && !same(bare(before.formula), bare(after.formula))) {
    const note = after.formula && after.formula.meta && after.formula.meta.note;
    const undone = before.formulaPrev && after.formula && same(bare(before.formulaPrev), bare(after.formula));
    out.push((undone ? 'Undid the last 6-a-side formula change' : 'Changed the 6-a-side formula') + (note && !undone ? ': ' + note : ''));
  }
  // The 5-a-side formula is compared as it works out, so first storing the one that was
  // already in use (the 6-a-side formula with the 5-a-side lean) is not logged as a change.
  // The same for 7 to 11-a-side, which follow the 6-a-side formula until first saved.
  if (had) {
    OTHERS.forEach((n) => {
      const key = 'formula' + n;
      const worked = (d) => JSON.stringify(bare(formulasOf(d)[n]));
      if (worked(before) === worked(after)) return;
      const note = after[key] && after[key].meta && after[key].meta.note;
      const undone = before[key + 'Prev'] && after[key] && same(bare(before[key + 'Prev']), bare(after[key]));
      out.push((undone ? 'Undid the last ' + n + '-a-side formula change' : 'Changed the ' + n + '-a-side formula') + (note && !undone ? ': ' + note : ''));
    });
  }
  return out;
}

const cleanBy = (v) => (typeof v === 'string' ? v.trim().slice(0, 40) : '') || 'Someone';

// Autosave sends a save a moment after every change, so picking a squad would be a dozen
// entries. Saves by the same person within ten minutes merge into one, keeping the latest
// wording of anything said twice ("Picked the squad (9 players)" then "(10 players)").
const MERGE_MS = 10 * 60 * 1000;
const stem = (t) => t.replace(/\s*\(.*\)$/, '');

async function appendLog(store, entry) {
  const log = (await store.get(LOG, { type: 'json' })) || { entries: [] };
  const entries = log.entries || [];
  const last = entries[0];
  if (last && !entry.restore && !last.restore && last.by === entry.by && Date.parse(entry.at) - Date.parse(last.at) < MERGE_MS) {
    const merged = last.changes.filter((t) => !entry.changes.some((n) => stem(n) === stem(t)));
    entries[0] = { ...last, rev: entry.rev, at: entry.at, changes: [...merged, ...entry.changes].slice(-30) };
  } else entries.unshift(entry);
  log.entries = entries.slice(0, LOG_MAX);
  await store.setJSON(LOG, log);
}

// A copy of a stored record, kept under its own key with a line in the index. The
// oldest go once there are more than BACKUP_MAX.
async function saveBackup(store, record, by, reason) {
  const index = (await store.get(BACKUPS, { type: 'json' })) || { list: [] };
  const at = new Date().toISOString();
  const id = at.replace(/[^0-9]/g, '').slice(0, 17) + '-' + record.rev;
  await store.setJSON('backup/' + id, record);
  const doc = record.doc || {};
  const item = { id, at, by, reason, rev: record.rev, players: (doc.players || []).length, weeks: (doc.history || []).length };
  const list = [item, ...(index.list || [])];
  const keep = list.slice(0, BACKUP_MAX);
  for (const old of list.slice(BACKUP_MAX)) await store.delete('backup/' + old.id);
  await store.setJSON(BACKUPS, { list: keep });
  return item;
}

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });

  const params = new URL(req.url).searchParams;

  // The change log and the backup list hold ratings and names of who changed what, so
  // they are for password holders only.
  if (req.method === 'GET' && (params.get('log') || params.get('backups'))) {
    const denied = await authorise(req);
    if (denied) return denied;
    if (params.get('log')) {
      const log = (await store.get(LOG, { type: 'json' })) || { entries: [] };
      return json({ entries: (log.entries || []).slice(0, Number(params.get('limit')) || 100) });
    }
    const index = (await store.get(BACKUPS, { type: 'json' })) || { list: [] };
    return json({ list: index.list || [] });
  }

  if (req.method === 'GET') {
    const rec = await store.get(KEY, { type: 'json' });
    const meta = params.get('meta');
    if (!rec) return json({ rev: 0, updatedAt: null, doc: null });
    return json(meta ? { rev: rec.rev, updatedAt: rec.updatedAt } : rec);
  }

  if (req.method === 'POST') {
    const denied = await authorise(req);
    if (denied) return denied;
    let body = {};
    try {
      body = JSON.parse((await req.text()) || '{}');
    } catch {
      body = {};
    }
    const by = cleanBy(body.by);

    // Check the team formula code without writing anything.
    if (params.get('formula')) {
      const no = await formulaDenied(req, store);
      return no || json({ ok: true });
    }

    // Back up now: a copy of what is stored, on demand.
    if (params.get('backup')) {
      const current = await store.get(KEY, { type: 'json' });
      if (!current) return json({ error: 'nothing-to-back-up' }, 400);
      const item = await saveBackup(store, current, by, params.get('backup') === 'formula' ? 'before-formula' : 'manual');
      return json({ ok: true, backup: item });
    }

    // Restore: the backup becomes the document as a new revision, so nothing is lost —
    // what was there is itself backed up first, and the log says who restored what.
    const restoreId = params.get('restore');
    if (restoreId) {
      const backup = await store.get('backup/' + restoreId, { type: 'json' });
      if (!backup || !backup.doc) return json({ error: 'no-such-backup' }, 404);
      const current = await store.get(KEY, { type: 'json' });
      const rev = current ? Number(current.rev) || 0 : 0;
      if (Number(body.rev) !== rev) {
        return json({ error: 'conflict', rev, updatedAt: current ? current.updatedAt : null, doc: current ? current.doc : null }, 409);
      }
      if (current) await saveBackup(store, current, by, 'before-restore');
      const next = { rev: rev + 1, updatedAt: new Date().toISOString(), doc: backup.doc };
      await store.setJSON(KEY, next);
      await appendLog(store, { rev: next.rev, at: next.updatedAt, by, changes: ['Restored the backup from ' + backup.updatedAt.slice(0, 10) + ' (revision ' + backup.rev + ')'], restore: true });
      return json({ rev: next.rev, updatedAt: next.updatedAt, doc: next.doc });
    }

    // Otherwise a password check that writes nothing, so signing in can fail cleanly.
    return json({ ok: true });
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

    // A tab still running a version of the app from before the formula could be edited
    // saves documents without one. Keep the stored formula rather than let that wipe it.
    if (current && current.doc && current.doc.formula && !('formula' in doc)) {
      doc.formula = current.doc.formula;
      doc.formulaPrev = current.doc.formulaPrev || null;
    }
    OTHERS.map((n) => 'formula' + n).forEach((key) => {
      if (current && current.doc && current.doc[key] && !(key in doc)) {
        doc[key] = current.doc[key];
        doc[key + 'Prev'] = current.doc[key + 'Prev'] || null;
      }
    });

    // Changing the formula, or its undo slot, needs the second code as well.
    const before = current && current.doc ? current.doc : {};
    const worked = (d, n) => JSON.stringify(bare5(formulasOf(d)[n]));
    if (
      formulaKey(before.formula) !== formulaKey(doc.formula) ||
      prevKey(before.formulaPrev) !== prevKey(doc.formulaPrev) ||
      OTHERS.some((n) => worked(before, n) !== worked(doc, n) || prevKey(before['formula' + n + 'Prev']) !== prevKey(doc['formula' + n + 'Prev']))
    ) {
      const no = await formulaDenied(req, store);
      if (no) {
        const b = await no.json();
        return json({ ...b, error: 'formula-locked', reason: b.error }, 403);
      }
    }

    // Once a week, the first save keeps a copy of what was there before it.
    if (current) {
      const index = (await store.get(BACKUPS, { type: 'json' })) || { list: [] };
      const last = (index.list || []).find((b) => b.reason === 'weekly');
      if (!last || Date.now() - Date.parse(last.at) >= WEEK_MS) await saveBackup(store, current, cleanBy(body.by), 'weekly');
    }

    const next = { rev: rev + 1, updatedAt: new Date().toISOString(), doc };
    await store.setJSON(KEY, next);
    const changes = summarise(current && current.doc, doc);
    if (changes.length) await appendLog(store, { rev: next.rev, at: next.updatedAt, by: cleanBy(body.by), changes });
    return json({ rev: next.rev, updatedAt: next.updatedAt });
  }

  return json({ error: 'method-not-allowed' }, 405);
};

export const config = { path: '/api/data' };
