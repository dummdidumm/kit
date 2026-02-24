import { describe, expect, it } from 'vitest';

import {
	dual_runtime_matrix,
	public_api_entrypoints,
	required_conformance_scripts,
	rewrite_invariants,
	stabilization_gates
} from './guardrails.js';

describe('rewrite guardrails', () => {
	it('defines the non-negotiable rewrite invariants', () => {
		expect(rewrite_invariants).toContain(
			'Public API remains compatible unless behind explicit experimental flags'
		);
		expect(rewrite_invariants).toContain('All existing e2e suites must pass before default flip');
	});

	it('defines public API entrypoints for contract checks', () => {
		expect(Object.keys(public_api_entrypoints).sort()).toEqual([
			'.',
			'./hooks',
			'./node',
			'./node/polyfills',
			'./vite'
		]);
	});

	it('pins required conformance scripts for baseline e2e coverage', () => {
		expect(required_conformance_scripts).toContain('test:integration');
		expect(required_conformance_scripts).toContain('test:cross-platform:build');
		expect(required_conformance_scripts).toContain('test:svelte-async:build');
	});

	it('defines stabilization matrix and required gates', () => {
		expect(dual_runtime_matrix).toContain('legacy');
		expect(dual_runtime_matrix).toContain('rewrite-shadow');
		expect(stabilization_gates).toContain('public-api-contract');
		expect(stabilization_gates).toContain('e2e-pass');
	});
});
