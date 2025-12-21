// ApiError - מבנה שגיאה מובנה לתקשורת HTTP
// מייצג שגיאה עם סטטוס HTTP, קוד אופציונלי והודעה

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  408: 'Request timeout',
  409: 'Conflict',
  422: 'Unprocessable entity',
  429: 'Too many requests',
  500: 'Internal server error',
  502: 'Bad gateway',
  503: 'Service unavailable',
  504: 'Gateway timeout',
};

const DEFAULT_MESSAGE = 'Network error';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: any;

  constructor(status: number, message?: string, code?: string, data?: any) {
    const resolvedMessage = message ?? FALLBACK_MESSAGES[status] ?? DEFAULT_MESSAGE;
    super(resolvedMessage);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}
