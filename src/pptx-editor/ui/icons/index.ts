/**
 * @file Icon exports for pptx-editor
 *
 * Re-exports lucide-react icons with semantic names for the editor.
 * Using named exports ensures tree-shaking works correctly.
 */

export {
  // Selection
  MousePointer2 as SelectIcon,

  // Basic shapes
  Square as RectIcon,
  RectangleHorizontal as RoundRectIcon,
  Circle as EllipseIcon,
  Triangle as TriangleIcon,
  Diamond as DiamondIcon,
  Star as StarIcon,

  // Arrows
  ArrowRight as RightArrowIcon,
  ArrowLeft as LeftArrowIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,

  // Lines
  Minus as LineIcon,
  Link2 as ConnectorIcon,

  // Path drawing
  PenTool as PenIcon,
  Pencil as PencilIcon,

  // Text
  Type as TextBoxIcon,

  // Actions
  Undo2 as UndoIcon,
  Redo2 as RedoIcon,
  Trash2 as TrashIcon,
  Copy as CopyIcon,
  Clipboard as PasteIcon,
  Scissors as CutIcon,

  // Layer ordering
  Layers as BringToFrontIcon,
  LayersIcon as SendToBackIcon,
  MoveUp as BringForwardIcon,
  MoveDown as SendBackwardIcon,

  // Grouping
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  Folder as FolderIcon,

  // Objects
  Image as PictureIcon,
  Table as TableIcon,
  BarChart3 as ChartIcon,
  GitBranch as DiagramIcon,
  FileBox as OleObjectIcon,
  Shapes as UnknownShapeIcon,

  // UI elements
  Plus as AddIcon,
  X as CloseIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ChevronLeft as ChevronLeftIcon,
  Check as CheckIcon,
  MoreHorizontal as MoreIcon,
  Settings as SettingsIcon,
  Sparkles as FxIcon,
  Eye as VisibleIcon,
  EyeOff as HiddenIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,

  // Alignment
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  AlignRight as AlignRightIcon,
  AlignVerticalJustifyStart as AlignTopIcon,
  AlignVerticalJustifyCenter as AlignMiddleIcon,
  AlignVerticalJustifyEnd as AlignBottomIcon,

  // Also export LucideIcon type for component props
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

// Re-export icon tokens for consistent sizing
export { iconTokens } from "../design-tokens";
