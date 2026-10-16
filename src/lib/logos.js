// Real club badges, looked up from Wikipedia as they are needed.
//
// Each club's article carries its crest as the lead image, and Wikipedia's page-image
// API hands back a thumbnail URL for it with CORS open to any origin. Asking by article
// title (with redirects followed) means a club keeps its badge through a redesign and
// nothing has to be bundled or kept in step by hand. Lookups are batched — every club
// on screen goes in one request — and cached in the browser for a month, with misses
// kept for a day so a bad title is not re-asked on every render. Anything that fails
// leaves the drawn shield in place.
import { useEffect, useState } from 'react';
import { clubOf } from './clubs.js';

const API = 'https://en.wikipedia.org/w/api.php';
const SIZE = 160; // enough for the honours hero at 2× pixel density
const KEY = 'fufa.tb.logos.v1';
const HIT_TTL = 30 * 24 * 3600 * 1000;
const MISS_TTL = 24 * 3600 * 1000;

let cache = null; // code -> { url: string|null, t: number }
const listeners = new Set();
const pending = new Set();
let timer = null;

function load() {
  if (cache) return cache;
  cache = {};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (raw && typeof raw === 'object') cache = raw;
  } catch {
    /* no storage, or none we can read: the session cache still works */
  }
  return cache;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

function fresh(entry) {
  if (!entry) return false;
  return Date.now() - entry.t < (entry.url ? HIT_TTL : MISS_TTL);
}

// The badge URL if it is known, null if the lookup failed recently, undefined if it
// has not been asked yet.
export function knownLogo(code) {
  const e = load()[code];
  return fresh(e) ? e.url : undefined;
}

function notify() {
  listeners.forEach((fn) => fn());
}

async function flush() {
  timer = null;
  const codes = Array.from(pending);
  pending.clear();
  const clubs = codes.map(clubOf).filter(Boolean);
  if (!clubs.length) return;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    redirects: '1',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: String(SIZE),
    pilicense: 'any', // crests are non-free images; the default leaves them out
    titles: clubs.map((c) => c.wiki).join('|'),
  });
  let byTitle = {};
  try {
    const res = await fetch(API + '?' + params.toString(), { mode: 'cors', credentials: 'omit' });
    const data = await res.json();
    const q = (data && data.query) || {};
    // Follow the API's own account of what each asked-for title became.
    const to = {};
    (q.normalized || []).forEach((n) => (to[n.from] = n.to));
    (q.redirects || []).forEach((r) => (to[r.from] = r.to));
    const resolve = (t) => {
      let cur = t;
      for (let i = 0; i < 4 && to[cur]; i++) cur = to[cur];
      return cur;
    };
    const pages = Object.values(q.pages || {});
    clubs.forEach((c) => {
      const page = pages.find((p) => p.title === resolve(c.wiki));
      byTitle[c.code] = page && page.thumbnail && page.thumbnail.source ? page.thumbnail.source : null;
    });
  } catch {
    // Offline, blocked, or Wikipedia down: remember the miss briefly and move on.
    byTitle = Object.fromEntries(clubs.map((c) => [c.code, null]));
  }
  const now = Date.now();
  clubs.forEach((c) => {
    cache[c.code] = { url: byTitle[c.code] || null, t: now };
  });
  persist();
  notify();
}

export function requestLogo(code) {
  if (!clubOf(code) || knownLogo(code) !== undefined || pending.has(code)) return;
  pending.add(code);
  if (!timer) timer = setTimeout(flush, 30);
}

// The badge URL for a club, or null while it is unknown or unavailable.
export function useLogo(code) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!code) return undefined;
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    requestLogo(code);
    return () => listeners.delete(fn);
  }, [code]);
  const url = code ? knownLogo(code) : null;
  return url || null;
}

// Forgets a badge that failed to load as an image, so the shield shows and the next
// visit asks again.
export function dropLogo(code) {
  if (!cache || !cache[code]) return;
  cache[code] = { url: null, t: Date.now() };
  persist();
  notify();
}
