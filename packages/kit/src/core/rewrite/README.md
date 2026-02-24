# SvelteKit rewrite guardrails

This directory contains machine-checked guardrails for the Svelte 5 + Vite Environment API rewrite.

## Goals

- Keep public runtime API surfaces stable while internals are rewritten
- Preserve behavioral semantics for routing, loading, actions, and navigation
- Keep conformance/e2e coverage explicit and mandatory

## Guardrail artifacts

- `guardrails.js` — rewrite invariants and conformance script requirements
- `guardrails.spec.js` — tests asserting guardrail completeness
- `public-api-contract.json` — snapshot of runtime export names for public entrypoints

## Verification commands

- `pnpm --dir packages/kit test:rewrite:api-contract`
- `pnpm --dir packages/kit test:rewrite:conformance`
- `pnpm --dir packages/kit test:rewrite:baseline`
