import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../../../../components/ui';
import type { IconName } from '../../../../components/ui';
import styles from './NavigationPanel.module.css';

interface NavLinkItem {
  path: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

interface NavigationPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * פאנל ניווט צדדי (ימין) לאזור הניהול
 * מכיל לוגו וקישורים לכל דפי הניהול
 */
const NavigationPanel: React.FC<NavigationPanelProps> = ({ isOpen = true, onClose }) => {
  // רשימת קישורי הניווט
  const navigationLinks: NavLinkItem[] = [
    {
      path: '/admin',
      label: 'דשבורד',
      icon: 'LayoutDashboard',
      end: true, // end=true כדי שיהיה active רק בנתיב המדויק
    },
    {
      path: '/admin/orders',
      label: 'הזמנות',
      icon: 'ShoppingCart',
    },
    {
      path: '/admin/products',
      label: 'מוצרים',
      icon: 'Package',
    },
    {
      path: '/admin/categories',
      label: 'קטגוריות',
      icon: 'FolderTree',
    },
    {
      path: '/admin/filter-attributes',
      label: 'מאפייני מוצרים',
      icon: 'Filter',
    },
    // {
    //   path: '/admin/customers',
    //   label: 'לקוחות',
    //   icon: 'Users',
    // },
    {
      path: '/admin/customer-groups',
      label: 'קבוצות לקוח',
      icon: 'UsersRound',
    },
    {
      path: '/admin/user-management',
      label: 'ניהול משתמשים',
      icon: 'Shield',
    },
    {
      path: '/admin/banners',
      label: 'באנרים',
      icon: 'Image',
    },
    {
      path: '/admin/inventory',
      label: 'ניהול מלאי',
      icon: 'Boxes',
    },
    {
      path: '/admin/stock-alerts',
      label: 'התראות מלאי',
      icon: 'Bell',
    },
    {
      path: '/admin/reports',
      label: 'דוחות',
      icon: 'BarChart3',
    },
    {
      path: '/admin/settings',
      label: 'הגדרות',
      icon: 'Settings',
    },
  ];

  return (
    <aside className={`${styles.navigationPanel} ${isOpen ? styles.mobileOpen : styles.mobileHidden}`}>
      {/* כותרת + לוגו */}
      <div className={styles.header}>
        <div className="titleIconSquare">
          <Icon name="Store" size={28} />
        </div>
        <h1 className={styles.title}>לוח ניהול</h1>
        {/* כפתור סגירה במובייל */}
        {onClose && (
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="סגור תפריט"
          >
            <Icon name="X" size={24} />
          </button>
        )}
      </div>

      {/* רשימת קישורי ניווט */}
      <nav className={styles.navigation}>
        <ul className={styles.navList}>
          {navigationLinks.map((link) => (
            <li key={link.path} className={styles.navItem}>
              <NavLink
                to={link.path}
                end={link.end}
                onClick={onClose} // סגירת התפריט כשלוחצים על קישור
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.icon}>
                  <Icon name={link.icon} size={20} />
                </span>
                <span className={styles.label}>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* פוטר (אופציונלי) */}
      <div className={styles.footer}>
        <div className={styles.version}>גרסה 1.0.0</div>
      </div>
    </aside>
  );
};

export default NavigationPanel;
