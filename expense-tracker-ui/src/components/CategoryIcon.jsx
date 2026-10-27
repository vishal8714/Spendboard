import { categoryColor } from '../utils.js';
import {
  IconBag,
  IconBook,
  IconBowl,
  IconBus,
  IconDots,
  IconFilm,
  IconGift,
  IconHeart,
  IconHome,
  IconPlane,
  IconReceipt,
} from './Icons.jsx';

// Picks an icon from words in the category name; anything unknown gets the "other" dots.
const RULES = [
  [/bill|utilit|electric|phone|internet|recharge|subscri/i, IconReceipt],
  [/food|grocer|restaurant|dining|lunch|dinner|eat|coffee/i, IconBowl],
  [/transport|travel|commute|fuel|petrol|cab|taxi|metro|bus|car/i, IconBus],
  [/shop|cloth|fashion/i, IconBag],
  [/rent|home|house|mortgage/i, IconHome],
  [/entertain|movie|film|music|game|fun/i, IconFilm],
  [/health|medic|doctor|pharma|fitness|gym/i, IconHeart],
  [/educat|book|course|school|study/i, IconBook],
  [/trip|flight|holiday|vacation/i, IconPlane],
  [/gift|donat|charity/i, IconGift],
];

export const iconForCategory = (name = '') => RULES.find(([re]) => re.test(name))?.[1] ?? IconDots;

/** A rounded tile tinted with the category's colour. */
export default function CategoryIcon({ category, size = 40 }) {
  const Icon = iconForCategory(category?.name);
  return (
    <span
      className="cat-icon"
      style={{ '--chip': categoryColor(category?.id), width: size, height: size }}
      aria-hidden="true"
    >
      <Icon width={size * 0.45} height={size * 0.45} />
    </span>
  );
}
