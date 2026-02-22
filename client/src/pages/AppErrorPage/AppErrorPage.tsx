import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button, Icon, Typography } from '../../components/ui';
import styles from './AppErrorPage.module.css';

// בדיקה האם מדובר בתקלה אופיינית של טעינת קובץ דינמי אחרי דיפלוי חדש
const isDynamicImportFailure = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('failed to fetch dynamically imported module') ||
    normalizedMessage.includes('importing a module script failed') ||
    normalizedMessage.includes('loading chunk') ||
    normalizedMessage.includes('chunkloaderror')
  );
};

const AppErrorPage = () => {
  const error = useRouteError();

  // חילוץ סטטוס/כותרת/תיאור מתוך השגיאה שמגיעה מהראוטר
  let statusCode = 500;
  let title = 'משהו השתבש';
  let description = 'אירעה תקלה בלתי צפויה. אפשר לנסות לרענן את הדף ולנסות שוב.';

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    title = error.status === 404 ? 'העמוד לא נמצא' : 'שגיאת מערכת';
    description = error.statusText || description;
  } else if (error instanceof Error) {
    if (isDynamicImportFailure(error.message)) {
      title = 'מבצעים עדכון למערכת';
      description = 'בוצע עדכון חדש באתר. רענון קצר יטען את הגרסה העדכנית בצורה תקינה.';
    } else {
      description = error.message || description;
    }
  }

  return (
    <main className={styles.page} role="main" aria-live="polite">
      <section className={styles.card}>
        <div className={styles.iconWrap}>
          <Icon name="AlertCircle" size={42} className={styles.icon} />
        </div>

        <Typography variant="h1" align="center" className={styles.title}>
          {title}
        </Typography>

        <Typography variant="body1" align="center" className={styles.description}>
          {description}
        </Typography>

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            רענון הדף
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign('/')}>
            חזרה לדף הבית
          </Button>
        </div>

        <Typography variant="caption" align="center" className={styles.meta}>
          קוד שגיאה: {statusCode}
        </Typography>
      </section>
    </main>
  );
};

export default AppErrorPage;