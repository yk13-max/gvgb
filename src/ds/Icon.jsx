import {
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Download,
  FilterX,
  LayoutGrid,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Shuffle,
  Table,
  Trash2,
  Users,
  X,
} from 'lucide-react';

// The design system wraps Lucide by name. The prototype loaded Lucide from a CDN and
// swapped <i data-lucide> nodes in place; here the icons are imported so nothing
// mutates DOM React owns, and the bundle only carries the glyphs actually used.
const registry = {
  'bar-chart-2': BarChart2,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'clipboard-list': ClipboardList,
  copy: Copy,
  download: Download,
  'filter-x': FilterX,
  'layout-grid': LayoutGrid,
  'message-circle': MessageCircle,
  pencil: Pencil,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  'share-2': Share2,
  shuffle: Shuffle,
  table: Table,
  'trash-2': Trash2,
  users: Users,
  x: X,
};

export default function Icon({ name, size = 18, strokeWidth = 1.75, color = 'currentColor', style, ...rest }) {
  const Glyph = registry[name];
  if (!Glyph) {
    if (import.meta.env.DEV) console.warn('Icon: unknown name "' + name + '"');
    return null;
  }
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
      aria-hidden="true"
      {...rest}
    />
  );
}
