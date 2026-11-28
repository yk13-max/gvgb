import { Button, Icon } from '../ds/index.js';

// The picker that sits on Scores and on Awards. Signed in, a button beside it opens the
// seasons dialog; signed out it is just the picker.
export default function SeasonBar({ options, value, onChange, onManage, canEdit }) {
  return (
    <div className="tb-seasonbar">
      <label>
        <span>Season</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Season">
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {canEdit && (
        <Button variant="secondary" size="sm" icon={<Icon name="calendar" size={15} />} onClick={onManage}>
          Seasons
        </Button>
      )}
    </div>
  );
}
