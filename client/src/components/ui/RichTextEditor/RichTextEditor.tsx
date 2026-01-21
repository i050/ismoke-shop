/**
 * RichTextEditor Component
 * מטרת הקומפוננטה: עורך טקסט עשיר עם כפתורי עיצוב בסיסיים
 * כולל: מודגש, נטוי, קו תחתון, רשימות
 * 
 * משתמש ב-contentEditable לפשטות (ללא תלויות חיצוניות)
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import styles from './RichTextEditor.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface RichTextEditorProps {
  /** ערך ה-HTML הנוכחי */
  value: string;
  /** פונקציה לשינוי ערך */
  onChange: (value: string) => void;
  /** placeholder */
  placeholder?: string;
  /** האם הטופס במצב loading */
  disabled?: boolean;
  /** מקסימום תווים */
  maxLength?: number;
  /** מינימום שורות */
  minRows?: number;
  /** שגיאה */
  error?: boolean;
  /** מזהה ייחודי */
  id?: string;
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'הקלד כאן...',
  disabled = false,
  maxLength = 5000,
  minRows = 6,
  error = false,
  id,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // ===== עדכון תוכן מבחוץ =====
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      updateCharCount();
    }
  }, [value]);

  // ===== חישוב כמות תווים =====
  const updateCharCount = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setCharCount(text.length);
    }
  }, []);

  // ===== טיפול בשינוי תוכן =====
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      
      // בדיקת אורך מקסימלי
      if (text.length > maxLength) {
        // קיצוץ הטקסט
        editorRef.current.innerText = text.substring(0, maxLength);
        // החזרת הסמן לסוף
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      updateCharCount();
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange, maxLength, updateCharCount]);

  // ===== פקודות עיצוב =====
  const execCommand = useCallback((command: string, value?: string) => {
    if (disabled) return;
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [disabled, handleInput]);

  // ===== בדיקה האם פקודה פעילה =====
  const isCommandActive = useCallback((command: string): boolean => {
    return document.queryCommandState(command);
  }, []);

  // ===== כפתורי עיצוב =====
  const toolbarButtons = [
    { command: 'bold', icon: 'Bold', title: 'מודגש (Ctrl+B)' },
    { command: 'italic', icon: 'Italic', title: 'נטוי (Ctrl+I)' },
    { command: 'underline', icon: 'Underline', title: 'קו תחתון (Ctrl+U)' },
    { command: 'strikeThrough', icon: 'Strikethrough', title: 'קו חוצה' },
    { type: 'separator' },
    { command: 'insertUnorderedList', icon: 'List', title: 'רשימת תבליטים' },
    { command: 'insertOrderedList', icon: 'ListOrdered', title: 'רשימה ממוספרת' },
    { type: 'separator' },
    { command: 'removeFormat', icon: 'RemoveFormatting', title: 'הסר עיצוב' },
  ];

  // ===== מונה תווים =====
  const getCounterClass = () => {
    if (charCount === 0) return styles.counterEmpty;
    if (charCount < maxLength * 0.8) return styles.counterGood;
    if (charCount < maxLength) return styles.counterWarning;
    return styles.counterDanger;
  };

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''} ${error ? styles.error : ''}`}>
      {/* סרגל כלים */}
      <div className={styles.toolbar}>
        {toolbarButtons.map((btn, index) => {
          if (btn.type === 'separator') {
            return <div key={index} className={styles.separator} />;
          }
          
          return (
            <button
              key={btn.command}
              type="button"
              className={`${styles.toolbarButton} ${isCommandActive(btn.command!) ? styles.active : ''}`}
              onClick={() => execCommand(btn.command!)}
              disabled={disabled}
              title={btn.title}
              aria-label={btn.title}
            >
              <Icon name={btn.icon as any} size={18} />
            </button>
          );
        })}
      </div>

      {/* אזור עריכה */}
      <div className={styles.editorWrapper}>
        <div
          ref={editorRef}
          id={id}
          className={`${styles.editor} ${isFocused ? styles.focused : ''}`}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          data-placeholder={placeholder}
          style={{ minHeight: `${minRows * 1.5}em` }}
          role="textbox"
          aria-multiline="true"
          aria-label="תיאור המוצר"
          dir="rtl"
        />
      </div>

      {/* מונה תווים */}
      <div className={styles.footer}>
        <span className={`${styles.charCounter} ${getCounterClass()}`}>
          {charCount.toLocaleString()}/{maxLength.toLocaleString()}
        </span>
        <span className={styles.hint}>
          השתמש בסרגל הכלים לעיצוב הטקסט
        </span>
      </div>
    </div>
  );
};

export default RichTextEditor;
