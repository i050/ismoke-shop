import React, { useState } from 'react';
import { Icon } from '../../../../../components/ui';
import styles from './TasksSection.module.css';

/**
 * מקטע משימות - רשימת משימות עם checkboxes
 * משתמש בקומפוננטת Checkbox מ-UI
 */

interface Task {
  id: number;
  text: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

const TasksSection: React.FC = () => {
  // רשימת משימות עם state
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, text: 'עדכון מחירי מוצרים לעונה החדשה', priority: 'high', completed: false },
    { id: 2, text: 'בדיקת הזמנות שממתינות לאישור', priority: 'high', completed: false },
    { id: 3, text: 'יצירת דוח מכירות חודשי', priority: 'medium', completed: false },
    { id: 4, text: 'עדכון תמונות מוצרים חדשים', priority: 'medium', completed: false },
    { id: 5, text: 'מענה לפניות לקוחות', priority: 'low', completed: false },
    { id: 6, text: 'גיבוי מסד נתונים', priority: 'low', completed: false },
  ]);

  // פונקציה לסימון/ביטול סימון משימה
  const toggleTask = (taskId: number) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // חישוב מספר משימות שהושלמו
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <section className={styles.tasksSection}>
      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>
              <Icon name="CheckCircle2" size={24} />
            </span>
            משימות להשלמה
          </h2>
          <span className={styles.badge}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <span className={styles.timeInfo}>עדכון אחרון: היום</span>
      </div>

      {/* תוכן - רשימת משימות */}
      <div className={styles.content}>
        <div className={styles.tasksGrid}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`${styles.taskItem} ${task.completed ? styles.completed : ''}`}
            >
              {/* Checkbox */}
              <div
                className={`${styles.checkbox} ${task.completed ? styles.checkboxCompleted : ''}`}
                onClick={() => toggleTask(task.id)}
                role="checkbox"
                aria-checked={task.completed}
                tabIndex={0}
              >
                {task.completed && (
                  <span className={styles.checkmark}>
                    <Icon name="Check" size={16} />
                  </span>
                )}
              </div>

              {/* טקסט המשימה */}
              <span className={styles.taskText}>{task.text}</span>

              {/* אינדיקטור עדיפות */}
              <span
                className={`${styles.priorityDot} ${styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`]}`}
                title={`עדיפות: ${task.priority === 'high' ? 'גבוהה' : task.priority === 'medium' ? 'בינונית' : 'נמוכה'}`}
              ></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TasksSection;
