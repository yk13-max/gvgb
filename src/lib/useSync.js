import { useCallback, useEffect, useRef, useState } from 'react';
import { backupNow, checkPassword, getBackups, getLog, getRecord, putRecord, restoreBackup, savedPassword, storePassword } from './remote.js';

const SAVE_DELAY = 1200; // let a burst of typing settle before writing
const MODE_KEY = 'fufa.tb.mode';

// Which kind of copy this device was on last time: a hosted one, or a static one with no
// function behind it. Read before the first request so the first paint can already act
// like the answer that is about to arrive, instead of guessing wrong and then flinching.
function rememberedMode() {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'local' || m === 'remote' ? m : null;
  } catch {
    return null;
  }
}
function rememberMode(m) {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    // Nothing to do; the next load will probe and get the same answer.
  }
}
const POLL_MS = 20000;
const RETRY_MS = [1000, 3000, 8000];

// Keeps the app's document and the hosted one in step.
//
// Shape of the thing: `push` is called with the current document on every change. When
// this browser holds the password, changes are written back after a short pause; when it
// doesn't, the app is a read-only window on whatever the organiser last saved. Either way
// the document arriving from the server wins over what was loaded from the cache, and a
// save that would land on top of someone else's is refused rather than merged.
export function useSync({ onAdopt, canonical }) {
  const [state, setState] = useState(() => ({
    mode: 'loading', // loading | local (no backend) | remote
    assume: rememberedMode(), // what 'loading' will most likely turn out to be
    online: true,
    unlocked: !!savedPassword(),
    saving: false,
    dirty: false,
    empty: false, // a backend with nothing saved in it yet
    disabled: false, // a backend with no password configured
    rev: 0,
    updatedAt: null,
    conflict: null,
    error: null,
  }));

  const adopt = useRef(onAdopt);
  adopt.current = onAdopt;
  const canon = useRef(canonical);
  canon.current = canonical;

  const mode = useRef('loading');
  const rev = useRef(0);
  const pw = useRef(savedPassword());
  const sent = useRef(null); // the document the server holds, serialised
  const want = useRef(null); // the newest document we have been handed
  const timer = useRef(null);
  const busy = useRef(false);
  const held = useRef(false); // a conflict is on screen; stop writing until it is settled
  const clash = useRef(null); // the server's version of the document, during a conflict
  const alive = useRef(true);

  const patch = useCallback((p) => {
    if (alive.current) setState((s) => ({ ...s, ...p }));
  }, []);

  // --- taking a document from the server -----------------------------------------
  const take = useCallback((record) => {
    rev.current = record.rev;
    clash.current = null;
    if (record.doc) {
      // Record what the server holds *before* handing it over, so the state change it
      // causes doesn't read as a local edit and bounce straight back as a save. It is
      // stored the way this app would write it, not as the raw bytes that arrived:
      // otherwise a different key order would look like a change on every single load.
      sent.current = (canon.current && canon.current(record.doc)) || JSON.stringify(record.doc);
      want.current = sent.current;
      adopt.current(record.doc);
    }
    patch({
      mode: 'remote',
      online: true,
      rev: record.rev,
      updatedAt: record.updatedAt,
      empty: !record.doc,
      dirty: false,
      conflict: null,
      error: null,
    });
  }, [patch]);

  // --- writing -------------------------------------------------------------------
  const flush = useCallback(async () => {
    if (busy.current || held.current) return;
    if (mode.current !== 'remote' || !pw.current) return;
    const doc = want.current;
    if (doc == null || doc === sent.current) return;

    busy.current = true;
    patch({ saving: true });
    const res = await putRecord({ rev: rev.current, doc: JSON.parse(doc), password: pw.current });
    busy.current = false;
    if (!alive.current) return;

    if (res.kind === 'saved') {
      rev.current = res.rev;
      sent.current = doc;
      const stillDirty = want.current !== sent.current;
      patch({ saving: false, online: true, rev: res.rev, updatedAt: res.updatedAt, dirty: stillDirty, empty: false, error: null });
      if (stillDirty) flush(); // more arrived while that one was in the air
      return;
    }
    if (res.kind === 'conflict') {
      held.current = true;
      clash.current = { rev: res.rev, updatedAt: res.updatedAt, doc: res.doc };
      patch({ saving: false, online: true, conflict: clash.current, dirty: true });
      return;
    }
    if (res.kind === 'unauthorized') {
      pw.current = '';
      storePassword('');
      patch({ saving: false, unlocked: false, dirty: true, error: 'The saved password was rejected. Sign in again to save.' });
      return;
    }
    if (res.kind === 'disabled') {
      patch({ saving: false, disabled: true, dirty: true, error: res.message });
      return;
    }
    // Offline, or the function erred. Keep the change and try again on the next tick.
    patch({ saving: false, online: res.kind !== 'offline', dirty: true });
  }, [patch]);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }, [flush]);

  const push = useCallback(
    (doc) => {
      const s = JSON.stringify(doc);
      if (s === want.current) return;
      want.current = s;
      // Before the first answer from the server there is nothing to compare against;
      // the load path sets the baseline and anything typed since is saved after it.
      if (mode.current === 'loading') return;
      patch({ dirty: s !== sent.current });
      if (mode.current === 'remote' && pw.current) schedule();
    },
    [patch, schedule]
  );

  // --- first load ----------------------------------------------------------------
  useEffect(() => {
    alive.current = true;
    (async () => {
      for (let i = 0; ; i++) {
        const r = await getRecord();
        if (!alive.current) return;
        if (r.kind === 'record') {
          mode.current = 'remote';
          rememberMode('remote');
          take(r);
          // Anything typed while the request was in flight still needs saving.
          if (pw.current && want.current !== sent.current) schedule();
          return;
        }
        if (r.kind === 'absent') {
          // No function answering: this is a plain static build, so the app runs on its
          // own with localStorage, exactly as it did before it was hosted.
          mode.current = 'local';
          rememberMode('local');
          patch({ mode: 'local', online: true });
          return;
        }
        // A network error on the very first request is more likely to be a flaky
        // connection than a missing backend, so retry a few times before deciding.
        if (i >= RETRY_MS.length) {
          mode.current = 'remote';
          patch({ mode: 'remote', online: false });
          return;
        }
        patch({ online: false });
        await new Promise((res) => setTimeout(res, RETRY_MS[i]));
        if (!alive.current) return;
      }
    })();
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, [patch, schedule, take]);

  // --- watching for someone else's save ------------------------------------------
  const poll = useCallback(async () => {
    if (mode.current !== 'remote' || busy.current || held.current || document.hidden) return;
    const meta = await getRecord({ metaOnly: true });
    if (!alive.current) return;
    if (meta.kind === 'offline') {
      patch({ online: false });
      return;
    }
    if (meta.kind !== 'record') return;
    patch({ online: true });
    if (meta.rev <= rev.current) return;

    const full = await getRecord();
    if (!alive.current || full.kind !== 'record' || !full.doc) return;
    // Their save is newer. With nothing of our own outstanding we just take it; with
    // unsaved changes here, that is a decision for whoever is holding the phone.
    if (want.current === sent.current) take(full);
    else {
      held.current = true;
      clash.current = { rev: full.rev, updatedAt: full.updatedAt, doc: full.doc };
      patch({ conflict: clash.current, online: true });
    }
  }, [patch, take]);

  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    const wake = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
    };
  }, [poll]);

  // --- things the UI asks for ----------------------------------------------------
  const unlock = useCallback(
    async (password) => {
      const res = await checkPassword(password);
      if (res.kind === 'ok') {
        pw.current = password;
        storePassword(password);
        patch({ unlocked: true, error: null, disabled: false });
        if (want.current !== sent.current) schedule();
        return { ok: true };
      }
      if (res.kind === 'unauthorized') return { ok: false, message: 'That password was not accepted.' };
      if (res.kind === 'disabled') return { ok: false, message: res.message };
      if (res.kind === 'offline') return { ok: false, message: 'Could not reach the site to check it. Try again in a moment.' };
      return { ok: false, message: 'Something went wrong checking that password.' };
    },
    [patch, schedule]
  );

  const lock = useCallback(() => {
    pw.current = '';
    storePassword('');
    patch({ unlocked: false, error: null });
  }, [patch]);

  const refresh = useCallback(async () => {
    if (mode.current !== 'remote') return;
    const full = await getRecord();
    if (!alive.current) return;
    if (full.kind === 'record') {
      held.current = false;
      take(full);
    } else patch({ online: full.kind !== 'offline' });
  }, [patch, take]);

  // Resolving a clash: take theirs and lose what is here, or keep ours and write over
  // the top of what they saved. No merge — two people editing a roster at once produce
  // nothing a machine can reconcile without guessing.
  const resolve = useCallback(
    (choice) => {
      const c = clash.current;
      if (!c) return;
      clash.current = null;
      held.current = false;
      if (choice === 'theirs') {
        take({ rev: c.rev, updatedAt: c.updatedAt, doc: c.doc });
        return;
      }
      rev.current = c.rev; // adopt their revision number, then write over its contents
      sent.current = null;
      patch({ conflict: null, dirty: true });
      schedule();
    },
    [patch, schedule, take]
  );

  const saveNow = useCallback(() => {
    clearTimeout(timer.current);
    flush();
  }, [flush]);

  // --- housekeeping ---------------------------------------------------------------
  const loadLog = useCallback(() => getLog(pw.current), []);
  const loadBackups = useCallback(() => getBackups(pw.current), []);
  const makeBackup = useCallback((reason) => backupNow(pw.current, reason), []);

  // Restoring replaces what is here with the backup. Anything unsaved on this device is
  // dropped (the dialog says so first); the server backs up the current copy before it
  // restores, so nothing that was saved is lost.
  const restore = useCallback(
    async (id) => {
      clearTimeout(timer.current);
      let res = await restoreBackup(pw.current, id, rev.current);
      if (res.kind === 'conflict') {
        // Somebody saved a moment ago; restore on top of their revision instead.
        const meta = await getRecord({ metaOnly: true });
        if (meta.kind === 'record') res = await restoreBackup(pw.current, id, meta.rev);
      }
      if (res.kind === 'restored') {
        held.current = false;
        take({ rev: res.rev, updatedAt: res.updatedAt, doc: res.doc });
        return { ok: true };
      }
      return { ok: false, message: res.kind === 'unauthorized' ? 'The password was rejected.' : res.kind === 'offline' ? 'Could not reach the site.' : 'The restore did not go through.' };
    },
    [take]
  );

  return { ...state, push, unlock, lock, refresh, resolve, saveNow, loadLog, loadBackups, makeBackup, restore };
}
