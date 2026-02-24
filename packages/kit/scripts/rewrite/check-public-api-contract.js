import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
	public_api_entrypoints,
	resolve_from_package_root
} from '../../src/core/rewrite/guardrails.js';

const package_root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const baseline_path = resolve_from_package_root(
	package_root,
	'src/core/rewrite/public-api-contract.json'
);

/**
 * @param {string} source
 */
function extract_exports(source) {
	/** @type {Set<string>} */
	const exported = new Set();

	for (const match of source.matchAll(
		/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm
	)) {
		exported.add(match[1]);
	}

	for (const match of source.matchAll(
		/^export\s*\{([^}]+)\}(?:\s+from\s+['"][^'"]+['"])?\s*;?/gm
	)) {
		const specifiers = match[1].split(',');
		for (const specifier of specifiers) {
			const cleaned = specifier.trim();
			if (!cleaned) continue;

			// export { foo } or export { foo as bar }
			const [left, right] = cleaned.split(/\s+as\s+/);
			exported.add((right ?? left).trim());
		}
	}

	return [...exported].sort();
}

/**
 * @returns {Record<string, { file: string; exports: string[] }>}
 */
function create_contract() {
	/** @type {Record<string, { file: string; exports: string[] }>} */
	const contract = {};

	for (const [subpath, relative_file] of Object.entries(public_api_entrypoints)) {
		const absolute_file = resolve_from_package_root(package_root, relative_file);
		const source = fs.readFileSync(absolute_file, 'utf-8');
		contract[subpath] = {
			file: relative_file,
			exports: extract_exports(source)
		};
	}

	return contract;
}

const actual_contract = create_contract();
const should_update = process.argv.includes('--update');

if (should_update) {
	fs.mkdirSync(path.dirname(baseline_path), { recursive: true });
	fs.writeFileSync(baseline_path, `${JSON.stringify(actual_contract, null, '\t')}\n`);
	console.log(`Updated API contract snapshot at ${path.relative(package_root, baseline_path)}`);
	process.exit(0);
}

if (!fs.existsSync(baseline_path)) {
	console.error(
		`Missing baseline snapshot at ${path.relative(package_root, baseline_path)}.\n` +
			'Run: node scripts/rewrite/check-public-api-contract.js --update'
	);
	process.exit(1);
}

const expected_contract = JSON.parse(fs.readFileSync(baseline_path, 'utf-8'));

if (JSON.stringify(expected_contract) !== JSON.stringify(actual_contract)) {
	console.error('Public API contract mismatch detected.');
	console.error('If this is intentional, update the snapshot with:');
	console.error('node scripts/rewrite/check-public-api-contract.js --update');
	console.error('\nExpected:\n', JSON.stringify(expected_contract, null, '\t'));
	console.error('\nActual:\n', JSON.stringify(actual_contract, null, '\t'));
	process.exit(1);
}

console.log(`Public API contract verified (${Object.keys(actual_contract).length} entrypoints).`);
