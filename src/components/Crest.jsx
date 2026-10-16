import { useId } from 'react';
import { clubOf } from '../lib/clubs.js';
import { dropLogo, useLogo } from '../lib/logos.js';
import { SHIELD, crestShapes } from '../lib/crestShapes.js';

// A club's badge beside a name. The real crest, fetched once from Wikipedia and cached
// (see lib/logos.js); until it arrives — or if it never does — a shield drawn in the
// club's colours, so there is always something and it never blocks the page.
// Nothing renders when the player has no club.

function Pattern({ club }) {
  return crestShapes(club).map((sh, i) =>
    sh.kind === 'rect' ? (
      <rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} fill={sh.fill} />
    ) : (
      <polygon key={i} points={sh.points.join(' ')} fill={sh.fill} />
    )
  );
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
        <Pattern club={club} />
      </g>
      {/* A dark edge so a white shirt still has a shape on a white page, and a thin
          light line inside it so a black one has a shape on the honours cards. */}
      <path d={SHIELD} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" />
      <path d={SHIELD} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
    </svg>
  );
}
