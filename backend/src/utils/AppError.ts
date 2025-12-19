// Erro de aplicação com código HTTP controlado e detalhes opcionais
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Identifica se o erro é um AppError
export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;
