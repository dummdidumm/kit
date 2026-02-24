import path from 'node:path';

/**
 * Non-negotiable invariants for the Svelte 5 + Vite Environment API rewrite.
 * These are intentionally plain strings so they can be asserted in tests and
 * consumed by CLI checks.
 */
export const rewrite_invariants = [
	'Route resolution remains deterministic for equivalent route trees',
	'Load invalidation semantics match documented behavior',
	'Progressive enhancement and focus/reset semantics are preserved',
	'Public API remains compatible unless behind explicit experimental flags',
	'Adapters remain backwards-compatible via shims during migration',
	'All existing e2e suites must pass before default flip'
];

/**
 * Baseline conformance scripts that must remain available while rewrite work
 * is in progress. These script names are resolved against packages/kit/package.json.
 */
export const required_conformance_scripts = [
	'test:unit',
	'test:integration',
	'test:cross-platform:dev',
	'test:cross-platform:build',
	'test:server-side-route-resolution:dev',
	'test:server-side-route-resolution:build',
	'test:svelte-async:dev',
	'test:svelte-async:build'
];

/**
 * Minimal runtime matrix that must be exercised before stabilization.
 * - `legacy` ensures compatibility with current defaults
 * - `rewrite-shadow` runs the refactored internals behind a non-default mode
 */
export const dual_runtime_matrix = ['legacy', 'rewrite-shadow'];

/**
 * Stabilization gates checked before defaulting to the rewrite path.
 */
export const stabilization_gates = [
	'public-api-contract',
	'e2e-pass',
	'unit-parity',
	'adapter-compatibility',
	'performance-non-regression'
];

/**
 * Public entrypoints whose runtime exports are locked by the API contract check.
 * The keys are package subpaths, values are source files with runtime exports.
 */
export const public_api_entrypoints = {
	'.': 'src/exports/index.js',
	'./hooks': 'src/exports/hooks/index.js',
	'./node': 'src/exports/node/index.js',
	'./node/polyfills': 'src/exports/node/polyfills.js',
	'./vite': 'src/exports/vite/index.js'
};

/**
 * @param {string} package_root
 * @param {string} relative_path
 */
export function resolve_from_package_root(package_root, relative_path) {
	return path.resolve(package_root, relative_path);
}
