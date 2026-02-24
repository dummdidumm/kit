# Rewrite stabilization and rollout

This document defines how the Svelte 5 + Vite Environment API rewrite is rolled out without breaking users.

## Dual-runtime rollout model

Stabilization assumes two runtime modes:

- `legacy` — current/default runtime path
- `rewrite-shadow` — refactored runtime path exercised in CI and canary workflows

The default must remain `legacy` until all readiness gates pass.

## Readiness gates

Before flipping defaults, the following must be green:

1. Public API contract checks (`test:rewrite:api-contract`)
2. Baseline conformance script checks (`test:rewrite:conformance`)
3. Full typecheck (`pnpm -F @sveltejs/kit check`)
4. Existing e2e/integration suites (full mode)
5. Adapter compatibility (first-party adapters and representative third-party adapters)
6. Performance non-regression on representative apps

## Commands

- Fast gate:
  - `pnpm --dir packages/kit test:rewrite:readiness`
- Full gate:
  - `pnpm --dir packages/kit test:rewrite:readiness:full`

## Migration notes

### Adapter authors

- Continue using existing `Builder` APIs (`getClientDirectory`, `getServerDirectory`, etc.)
- New optional environment helpers are available:
  - `builder.environments`
  - `builder.getEnvironment(name)`
  - `builder.getEnvironmentDirectory(name)`
- Treat these as additive capabilities and keep existing adapter behavior unchanged.

### App authors

- Public SvelteKit API semantics remain unchanged during rewrite.
- Existing e2e expectations remain source of truth.
- Internal improvements are intentionally behind compatibility gates.
