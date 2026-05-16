---
description: API route conventions for Next.js route handlers
---

# API rules

- Every route handler starts with `deptMiddleware(req)` and destructures `{ dept_id, role, user_id }`
- Role checks use the `requireRole` helper: `requireRole(role, 'dept_admin')`
- All responses use `apiResponse.success(data)` or `apiResponse.error(code, message)`
- Response shape is always `{ data: T | null, error: string | null, meta?: object }`
- Never return raw Prisma objects — map to a DTO before returning
- All route handlers are wrapped in `withErrorHandler` to catch unhandled exceptions
- Use `NextResponse.json` — never `res.json`
- Streaming endpoints use `new ReadableStream` with the Vercel AI SDK `StreamingTextResponse`
