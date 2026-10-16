import { useId } from 'react';
import { clubOf } from '../lib/clubs.js';

// A club's colours on a shield. Drawn rather than downloaded: it is the same size as
// the text beside it, shows at once, and reads at 14px where a photograph of a badge
// would be a smudge. Nothing renders when the player has no club.

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
  if (!club) return null;
  return (
    <svg
      className={'tb-crest' + (className ? ' ' + className : '')}
      width={size}
      height={size * (28 / 24)}
      viewBox="0 0 24 28"
      role="img"
      aria-label={'Supports ' + club.name}
      data-club={club.code}
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
