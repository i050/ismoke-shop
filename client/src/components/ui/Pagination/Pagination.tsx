import React from 'react';
import { Icon } from '../Icon/Icon';
import { Button } from '../Button/Button';
import styles from './Pagination.module.css';

export interface PaginationProps {
  /** Current page (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Maximum number of page buttons to show (default: 5) */
  maxVisible?: number;
  /** Optional CSS class */
  className?: string;
}

/**
 * Pagination component for navigating through pages
 * Shows page numbers with prev/next buttons
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
  className
}) => {
  // Don't render if only 1 page or less
  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Calculate visible page numbers
  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    
    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show subset with ellipsis
      const halfVisible = Math.floor(maxVisible / 2);
      let start = Math.max(1, currentPage - halfVisible);
      let end = Math.min(totalPages, currentPage + halfVisible);

      // Adjust if at boundaries
      if (currentPage <= halfVisible) {
        end = maxVisible;
      } else if (currentPage >= totalPages - halfVisible) {
        start = totalPages - maxVisible + 1;
      }

      // Always show first page
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push(-1); // Ellipsis marker
        }
      }

      // Show middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Always show last page
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push(-1); // Ellipsis marker
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav className={`${styles.pagination} ${className || ''}`} aria-label="ניווט בין דפים">
      {/* Previous Button */}
      <Button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className={`${styles.navBtn} ${isFirstPage ? styles.disabled : ''}`}
        aria-label="דף קודם"
        title="דף קודם"
        variant="ghost"
        size="sm"
      >
        <Icon name="ChevronRight" size={18} />
      </Button>

      {/* Page Numbers */}
      <div className={styles.pages}>
        {visiblePages.map((page, index) => {
          if (page === -1) {
            // Ellipsis
            return (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                ...
              </span>
            );
          }

          return (
            <Button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`}
              aria-label={`עמוד ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              variant={page === currentPage ? 'primary' : 'ghost'}
              size="sm"
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Next Button */}
      <Button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className={`${styles.navBtn} ${isLastPage ? styles.disabled : ''}`}
        aria-label="דף הבא"
        title="דף הבא"
        variant="ghost"
        size="sm"
      >
        <Icon name="ChevronLeft" size={18} />
      </Button>
    </nav>
  );
};

export default Pagination;
