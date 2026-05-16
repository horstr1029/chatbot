---
description: Database and Prisma conventions
---

# Database rules

- All DB access goes through the singleton `prisma` client from `lib/db/client.ts`
- Every query that could be department-specific MUST include `where: { deptId: ctx.dept_id }`
  — do not trust the request body for dept_id, always use the value from the JWT context
- Use `prisma.$transaction` for any operation that writes to more than one table
- Never use `deleteMany` without a `where` clause
- Migrations are never edited after they are committed — create a new migration instead
- All `DateTime` fields are stored in UTC
- Soft deletes use an `deletedAt DateTime?` field — never hard delete user data
