import { spawnSync } from 'node:child_process';
import process from 'node:process';

import {
	dual_runtime_matrix,
	required_conformance_scripts,
	stabilization_gates
} from '../../src/core/rewrite/guardrails.js';

/**
 * @param {string} command
 * @param {string[]} args
 */
function run(command, args) {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

if (!dual_runtime_matrix.includes('legacy') || !dual_runtime_matrix.includes('rewrite-shadow')) {
	console.error(
		'Dual-runtime matrix must include both "legacy" and "rewrite-shadow" modes before stabilization.'
	);
	process.exit(1);
}

if (
	!stabilization_gates.includes('e2e-pass') ||
	!stabilization_gates.includes('public-api-contract')
) {
	console.error('Stabilization gates must include e2e and public API contract checks.');
	process.exit(1);
}

const full = process.argv.includes('--full');

console.log('Running rewrite readiness gates...');
console.log(`- Matrix modes: ${dual_runtime_matrix.join(', ')}`);
console.log(`- Full mode: ${full ? 'yes' : 'no'}`);

run('pnpm', ['run', 'test:rewrite:baseline']);
run('pnpm', ['run', 'check']);

if (full) {
	for (const script of required_conformance_scripts) {
		// baseline already checks script existence; full mode executes them
		run('pnpm', ['run', script]);
	}
}

console.log('Rewrite readiness gates passed.');
