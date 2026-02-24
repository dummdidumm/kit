import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { required_conformance_scripts } from '../../src/core/rewrite/guardrails.js';

const package_root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const package_json = JSON.parse(fs.readFileSync(path.join(package_root, 'package.json'), 'utf-8'));

/** @type {Record<string, string>} */
const scripts = package_json.scripts ?? {};

const missing = required_conformance_scripts.filter((script_name) => !(script_name in scripts));

if (missing.length > 0) {
	console.error('Missing required conformance scripts:');
	for (const script of missing) {
		console.error(`- ${script}`);
	}
	process.exit(1);
}

console.log(
	`Conformance suite baseline verified (${required_conformance_scripts.length} required scripts).`
);
