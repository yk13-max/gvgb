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

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
