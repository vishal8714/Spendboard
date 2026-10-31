import { categoryColor } from '../utils.js';

export default function CategoryChip({ category }) {
  if (!category) return null;
  const color = categoryColor(category.id);
  return (
    <span className="chip" style={{ '--chip': color }}>
      <span className="chip-dot" />
      {category.name}
    </span>
  );
}
