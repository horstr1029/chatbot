import { NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'

type ApiResponse<T> = { data: T | null; error: string | null; meta?: object }

export const apiResponse = {
  success<T>(data: T, meta?: object, status = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json({ data, error: null, ...(meta ? { meta } : {}) }, { status })
  },

  error(code: string, message: string, status = 400): NextResponse<ApiResponse<null>> {
    return NextResponse.json({ data: null, error: message, meta: { code } }, { status })
  },

  fromError(err: unknown): NextResponse<ApiResponse<null>> {
    if (err instanceof AppError) {
      return apiResponse.error(err.code, err.message, err.status)
    }
    return apiResponse.error('INTERNAL_ERROR', 'An unexpected error occurred', 500)
  },
}

export function withErrorHandler(
  handler: (req: Request, ctx?: unknown) => Promise<NextResponse>,
) {
  return async (req: Request, ctx?: unknown) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      return apiResponse.fromError(err)
    }
  }
}
