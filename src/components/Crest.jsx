import { useId } from 'react';
import { clubOf } from '../lib/clubs.js';
import { dropLogo, useLogo } from '../lib/logos.js';

// A club's badge beside a name. The real crest, fetched once from Wikipedia and cached
// (see lib/logos.js); until it arrives — or if it never does — a shield drawn in the
// club's colours, so there is always something and it never blocks the page.
// Nothing renders when the player has no club.

const SHIELD = 'M12 1.5 L21.5 4.5 V13 C21.5 19.5 17 24.5 12 26.5 C7 24.5 2.5 19.5 2.5 13 V4.5 Z';

function Pattern({ a, b, pattern }) {
  switch (pattern) {
    case 'stripes':
      return (
        <>
          <rect width="24" height="28" fill={a} />
          <rect x="6" width="4" height="28" fill={b} />
          <rect x="14" width="4" height="28" fill={b} />
        </>
      );
    case 'hoops':
      return (
        <>
          <rect width="24" height="28" fill={a} />
          <rect y="7" width="24" height="4.5" fill={b} />
          <rect y="16" width="24" height="4.5" fill={b} />
        </>
      );
    case 'halves':
      return (
        <>
          <rect width="24" height="28" fill={a} />
          <rect x="12" width="12" height="28" fill={b} />
        </>
      );
    case 'sash':
      return (
        <>
          <rect width="24" height="28" fill={a} />
          <polygon points="2,2 9,0 24,18 24,27" fill={b} />
        </>
      );
    case 'quarters':
      return (
        <>
          <rect width="24" height="28" fill={a} />
          <rect x="12" width="12" height="14" fill={b} />
          <rect y="14" width="12" height="14" fill={b} />
        </>
      );
    default:
      // Solid: the first colour, with the second as a band across the top.
      return (
        <>
          <rect width="24" height="28" fill={a} />
          <rect width="24" height="6" fill={b} />
        </>
      );
  }
}

export default function Crest({ code, size = 16, className, style }) {
  // Each shield clips its own pattern; the id has to be unique per instance.
  const id = 'crest' + useId().replace(/:/g, '');
  const club = clubOf(code);
  const logo = useLogo(club ? club.code : null);
  if (!club) return null;
  const cls = 'tb-crest' + (className ? ' ' + className : '');
  const label = 'Supports ' + club.name;
  const h = Math.round(size * (28 / 24));

  if (logo) {
    return (
      <img
        className={cls}
        src={logo}
        alt={label}
        title={club.name}
        width={h}
        height={h}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        data-club={club.code}
        data-logo="1"
        onError={() => dropLogo(club.code)}
        style={{ display: 'inline-block', flexShrink: 0, objectFit: 'contain', verticalAlign: '-0.25em', ...style }}
      />
    );
  }

  return (
    <svg
      className={cls}
      width={size}
      height={h}
      viewBox="0 0 24 28"
      role="img"
      aria-label={label}
      data-club={club.code}
      data-logo="0"
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: '-0.2em', ...style }}
    >
      <title>{club.name}</title>
      <defs>
        <clipPath id={id}>
          <path d={SHIELD} />
        </clipPath>
      </defs>
      <g clipPath={'url(#' + id + ')'}>
        <Pattern a={club.a} b={club.b} pattern={club.pattern} />
      </g>
      {/* A dark edge so a white shirt still has a shape on a white page, and a thin
          light line inside it so a black one has a shape on the honours cards. */}
      <path d={SHIELD} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" />
      <path d={SHIELD} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
    </svg>
  );
}
