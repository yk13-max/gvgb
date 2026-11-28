export function firstName(name) {
  return name.trim().split(' ')[0];
}

// "Sam Okafor" -> "Sam O", "Umesh R" -> "Umesh R", "Siv" -> "Siv".
// Two players sharing a first name still read apart on the board and in the chat.
export function shortName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return parts[0] + ' ' + parts[1][0].toUpperCase();
}

// A–Z by name, for anywhere a list of players is read rather than ranked. Case and
// accents are ignored so "Ólafur" sits with the Os and "dave" with the Ds.
export function byName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
