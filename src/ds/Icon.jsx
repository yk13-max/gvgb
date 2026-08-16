import {
  ArrowLeftRight,
  BarChart2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Copy,
  Download,
  FileJson,
  FilterX,
  History,
  LayoutGrid,
  List,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Shuffle,
  SlidersVertical,
  Table,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';

// The design system wraps Lucide by name. The prototype loaded Lucide from a CDN and
// swapped <i data-lucide> nodes in place; here the icons are imported so nothing
// mutates DOM React owns, and the bundle only carries the glyphs actually used.
const registry = {
  'arrow-left-right': ArrowLeftRight,
  'bar-chart-2': BarChart2,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'clipboard-list': ClipboardList,
  copy: Copy,
  download: Download,
  'file-json': FileJson,
  'filter-x': FilterX,
  history: History,
  'layout-grid': LayoutGrid,
  list: List,
  'message-circle': MessageCircle,
  'more-horizontal': MoreHorizontal,
  pencil: Pencil,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  'share-2': Share2,
  shuffle: Shuffle,
  'sliders-vertical': SlidersVertical,
  table: Table,
  'trash-2': Trash2,
  trophy: Trophy,
  upload: Upload,
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
