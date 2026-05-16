---
description: Testing conventions
---

# Testing rules

- Unit tests live next to source files: `retrieve.ts` → `retrieve.test.ts`
- E2E tests live in `tests/e2e/`
- Mock external services (Qdrant, n8n, Anthropic) — never make real API calls in unit tests
- Use `@anthropic-ai/sdk` mock from `tests/__mocks__/anthropic.ts`
- Every test that involves department scoping must assert the dept filter is present
- Test naming: `describe('functionName')` → `it('should {expected behaviour} when {condition}')`
- Minimum coverage for security-critical paths (auth, dept isolation, workflow approval): 90%
