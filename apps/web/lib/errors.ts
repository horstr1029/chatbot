export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  UNAUTHORIZED: () => new AppError('UNAUTHORIZED', 'Unauthorized', 401),
  FORBIDDEN: () => new AppError('FORBIDDEN', 'Forbidden', 403),
  NOT_FOUND: (resource = 'Resource') =>
    new AppError('NOT_FOUND', `${resource} not found`, 404),
  INVALID_ROLE: (required: string) =>
    new AppError('INVALID_ROLE', `Role '${required}' required`, 403),
  DEPT_MISMATCH: () =>
    new AppError('DEPT_MISMATCH', 'Department mismatch', 403),
}
