import {
    BarChart2,
    BedDouble,
    Bike,
    CalendarDays,
    Car,
    Compass,
    Flame,
    Gem,
    Globe,
    Mountain,
    Music,
    ShoppingBag,
    Star,
    Sun,
    type LucideIcon,
} from "lucide-react-native";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  housing: BedDouble,
  transportation: Car,
  activities: Compass,
  polls: BarChart2,
  itinerary: CalendarDays,
};

const RANDOM_ICON_POOL: LucideIcon[] = [
  Mountain,
  Globe,
  Sun,
  Music,
  ShoppingBag,
  Gem,
  Star,
  Bike,
  Flame,
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getCategoryIcon(name: string): LucideIcon {
  return (
    CATEGORY_ICONS[name.toLowerCase()] ??
    RANDOM_ICON_POOL[hashStr(name) % RANDOM_ICON_POOL.length]!
  );
}