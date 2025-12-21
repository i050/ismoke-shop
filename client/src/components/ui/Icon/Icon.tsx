import React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * רשימת האייקונים הנתמכים
 * הוספת אייקון חדש: רק הוסף את שמו כאן (לא צריך לייבא!)
 * 
 * יתרון: Vite/Rollup יבצעו tree-shaking אוטומטי - רק אייקונים בשימוש יכנסו ל-bundle
 */
export type IconName =
  // Navigation
  | 'LayoutDashboard' | 'ShoppingCart' | 'Package' | 'Users'
  | 'UsersRound' | 'Shield' | 'BarChart3' | 'Settings' | 'Store'
  // Actions
  | 'Search' | 'Bell' | 'HelpCircle' | 'Check' | 'CheckCircle' | 'CheckCircle2'
  | 'Clock' | 'Plus' | 'Minus' | 'Edit' | 'Trash2' | 'Download' | 'Upload' | 'Filter' | 'Undo'
  | 'Eye' | 'EyeOff' | 'ClipboardList' | 'RefreshCw' | 'ExternalLink' | 'Pencil' | 'Link2'
  | 'SlidersHorizontal' | 'ArrowUpDown' | 'RotateCcw' | 'ArrowUp' | 'ArrowDown'
  // Status
  | 'AlertCircle' | 'AlertTriangle' | 'CheckCheck' | 'XCircle' | 'Loader2' | 'Info'
  // Business
  | 'DollarSign' | 'TrendingUp' | 'TrendingDown' | 'CreditCard' | 'Receipt' | 'Boxes'
  // UI Elements
  | 'ChevronDown' | 'ChevronUp' | 'ChevronLeft' | 'ChevronRight' | 'ChevronLeftCircle' | 'ChevronRightCircle' | 'X' | 'Menu'
  | 'ChevronsDown' | 'ChevronsUp' | 'ChevronsLeft' | 'ChevronsRight'
  | 'Grid3x3' | 'List' | 'Inbox'
  // Content
  | 'Image' | 'File' | 'FileText' | 'FileCode' | 'FileSpreadsheet' | 'Folder' | 'FolderOpen' | 'FolderPlus' | 'FolderTree' | 'Calendar' | 'Mail' | 'MessageCircle'
  // Tech
  | 'Database' | 'Key' | 'Palette' | 'Truck' | 'Archive' | 'Target' | 'Flame' | 'Gem' | 'Construction'
  | 'Wallet' | 'Tag' | 'Code'
  // Charts
  | 'PieChart' | 'LineChart' | 'User'
  // Auth & Users
  | 'LogIn' | 'LogOut' | 'UserPlus' | 'UserCheck' | 'Lock' | 'Unlock'
  // Additional
  | 'Heart' | 'Share2' | 'Star';

/**
 * Props של רכיב האייקון
 */
interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  // תמיכה באירוע לחיצה כדי שניתן יהיה להעביר את ה-MouseEvent כפי שעושים ברכיבים אחרים
  onClick?: React.MouseEventHandler<SVGElement>;
  'aria-label'?: string;
}

/**
 * Icon Component - מעטפת אחידה לכל האייקונים באתר
 * 
 * דוגמאות שימוש:
 * <Icon name="ShoppingCart" size={20} />
 * <Icon name="Users" size={24} strokeWidth={2} />
 * <Icon name="Settings" className="text-blue-500" />
 * 
 * ביצועים: משתמש ב-dynamic import מ-lucide-react - tree-shaking אוטומטי
 */
export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 20, 
  className = '', 
  strokeWidth = 2,
  onClick,
  'aria-label': ariaLabel
}) => {
  // @ts-ignore - dynamic access to lucide-react icons
  const IconComponent = LucideIcons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }
  
  return (
    <IconComponent 
      size={size} 
      strokeWidth={strokeWidth}
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      style={{ stroke: 'currentColor', display: 'block' }}
    />
  );
};
