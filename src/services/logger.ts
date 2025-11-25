/* Simple console wrapper to keep logging consistent */
export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
  if (meta) {
    console.log(message, meta);
    return;
  }
  console.log(message);
};

export const logError = (message: string, error?: unknown): void => {
  if (error) {
    console.error(message, error);
    return;
  }
  console.error(message);
};

