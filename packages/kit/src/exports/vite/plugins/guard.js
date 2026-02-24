import path from 'node:path';

import { is_server_environment } from '../environment.js';

/**
 * @param {{
 *  svelte_config: import('types').ValidatedConfig;
 *  normalized_lib: string;
 *  normalized_cwd: string;
 *  normalized_node_modules: string;
 *  import_map: Map<string, Set<string>>;
 *  server_only_pattern: RegExp;
 *  normalize_id: (id: string, lib: string, cwd: string) => string;
 *  stackless: (message: string) => Error;
 *  error_for_missing_config: (feature: string, option: string, expected: string) => never;
 *  ensure_manifest_data: () => import('types').ManifestData;
 * }} options
 */
export function create_guard_plugin({
	svelte_config,
	normalized_lib,
	normalized_cwd,
	normalized_node_modules,
	import_map,
	server_only_pattern,
	normalize_id,
	stackless,
	error_for_missing_config,
	ensure_manifest_data
}) {
	/** @type {import('vite').Plugin} */
	const plugin = {
		name: 'vite-plugin-sveltekit-guard',

		// Run this plugin before built-in resolution, so that relative imports
		// are added to the module graph
		enforce: 'pre',

		/**
		 * @param {string} id
		 * @param {string | undefined} importer
		 * @param {any} options
		 */
		async resolveId(id, importer, options) {
			if (importer && !importer.endsWith('index.html')) {
				const resolved = await /** @type {any} */ (this).resolve(id, importer, {
					...options,
					skipSelf: true
				});

				if (resolved) {
					const normalized = normalize_id(resolved.id, normalized_lib, normalized_cwd);

					let importers = import_map.get(normalized);

					if (!importers) {
						importers = new Set();
						import_map.set(normalized, importers);
					}

					importers.add(normalize_id(importer, normalized_lib, normalized_cwd));
				}
			}
		},

		/**
		 * @param {string} id
		 * @param {import('../environment.js').ViteEnvironmentOptionsLike | undefined} options
		 */
		load(id, options) {
			if (is_server_environment(options) || process.env.TEST === 'true') {
				return;
			}

			// skip .server.js files outside the cwd or in node_modules, as the filename might not mean 'server-only module' in this context
			const is_internal = id.startsWith(normalized_cwd) && !id.startsWith(normalized_node_modules);

			const normalized = normalize_id(id, normalized_lib, normalized_cwd);

			const is_server_only =
				normalized === '$env/static/private' ||
				normalized === '$env/dynamic/private' ||
				normalized === '$app/server' ||
				normalized.startsWith('$lib/server/') ||
				(is_internal && server_only_pattern.test(path.basename(id)));

			if (is_server_only) {
				const manifest_data = ensure_manifest_data();

				/** @type {Set<string>} */
				const entrypoints = new Set();
				for (const node of manifest_data.nodes) {
					if (node.component) entrypoints.add(node.component);
					if (node.universal) entrypoints.add(node.universal);
				}

				if (manifest_data.hooks.client) entrypoints.add(manifest_data.hooks.client);
				if (manifest_data.hooks.universal) entrypoints.add(manifest_data.hooks.universal);

				const normalized = normalize_id(id, normalized_lib, normalized_cwd);
				const chain = [normalized];

				let current = normalized;
				let includes_remote_file = false;

				while (true) {
					const importers = import_map.get(current);
					if (!importers) break;

					const candidates = Array.from(importers).filter((importer) => !chain.includes(importer));
					if (candidates.length === 0) break;

					chain.push((current = candidates[0]));

					includes_remote_file ||= svelte_config.kit.moduleExtensions.some((ext) => {
						return current.endsWith(`.remote${ext}`);
					});

					if (entrypoints.has(current)) {
						const pyramid = chain
							.reverse()
							.map((entry, i) => {
								return `${' '.repeat(i + 1)}${entry}`;
							})
							.join(' imports\n');

						if (includes_remote_file) {
							error_for_missing_config(
								'remote functions',
								'kit.experimental.remoteFunctions',
								'true'
							);
						}

						let message = `Cannot import ${normalized} into code that runs in the browser, as this could leak sensitive information.`;
						message += `\n\n${pyramid}`;
						message += `\n\nIf you're only using the import as a type, change it to \`import type\`.`;

						throw stackless(message);
					}
				}

				throw new Error('An impossible situation occurred');
			}
		}
	};

	return plugin;
}
