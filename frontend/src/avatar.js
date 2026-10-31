// The profile circle. Users can pick their own initials and colour in Edit profile;
// when they haven't (null from the API), the initials come from the name and the colour is the default.

// Darker shades so white initials stay readable on every one
export const AVATAR_COLORS = [
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#2f6bff', label: 'Blue' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#16a34a', label: 'Green' },
  { value: '#ca8a04', label: 'Mustard' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#dc2626', label: 'Red' },
  { value: '#db2777', label: 'Pink' },
  { value: '#475569', label: 'Slate' },
];

export const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0].value;

export const autoInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export const avatarOf = (user) => ({
  text: user.avatarInitials || autoInitials(user.name),
  color: user.avatarColor || DEFAULT_AVATAR_COLOR,
});
