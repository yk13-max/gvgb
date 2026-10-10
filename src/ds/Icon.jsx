import {
  ArrowDown10,
  ArrowDownAZ,
  ArrowLeftRight,
  BarChart2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Cloud,
  CloudOff,
  Copy,
  Download,
  FileJson,
  FilterX,
  History,
  LayoutGrid,
  List,
  Lock,
  LockOpen,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Share2,
  Shuffle,
  SlidersVertical,
  Table,
  Trash2,
  TriangleAlert,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';

// The design system wraps Lucide by name. The prototype loaded Lucide from a CDN and
// swapped <i data-lucide> nodes in place; here the icons are imported so nothing
// mutates DOM React owns, and the bundle only carries the glyphs actually used.
const registry = {
  'arrow-down-1-0': ArrowDown10,
  'arrow-down-a-z': ArrowDownAZ,
  'arrow-left-right': ArrowLeftRight,
  'bar-chart-2': BarChart2,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'clipboard-list': ClipboardList,
  cloud: Cloud,
  'cloud-off': CloudOff,
  copy: Copy,
  download: Download,
  'file-json': FileJson,
  'filter-x': FilterX,
  history: History,
  'layout-grid': LayoutGrid,
  list: List,
  lock: Lock,
  'lock-open': LockOpen,
  'message-circle': MessageCircle,
  minus: Minus,
  'more-horizontal': MoreHorizontal,
  pencil: Pencil,
  plus: Plus,
  'refresh-cw': RefreshCw,
  'rotate-ccw': RotateCcw,
  'share-2': Share2,
  shuffle: Shuffle,
  'sliders-vertical': SlidersVertical,
  table: Table,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
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
