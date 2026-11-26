// Who the formula expects to win, live on the board: the same tug of war as the shared team
// sheet, laid across the top of the pitch. It moves as players are dragged, swapped or
// re-balanced. Words and a bar only, never a number, so it is the same for everyone.
export default function FavouriteBar({ fav }) {
  if (!fav) return null;
  const tone = fav.side || 'level';
  const share = Math.max(4, Math.min(96, fav.p * 100));
  const label = fav.side ? (fav.side === 'red' ? 'Red' : 'Blue') + ' · ' + fav.how.toLowerCase() : fav.how;
  return (
    <div className="tb-favbar" data-side={tone} role="img" aria-label={'Favourite: ' + label}>
      <div className="tb-favbar-words" aria-hidden="true">
        <span className="tb-favbar-tag">Favourite</span>
        <span className="tb-favbar-who">{label}</span>
      </div>
      <div className="tb-favbar-track" aria-hidden="true">
        <span className="tb-favbar-red" style={{ width: share + '%' }}>
          RED
        </span>
        <span className="tb-favbar-blue">BLUE</span>
        <span className="tb-favbar-mid" />
        <span className="tb-favbar-cut" style={{ left: share + '%' }} />
      </div>
    </div>
  );
}
