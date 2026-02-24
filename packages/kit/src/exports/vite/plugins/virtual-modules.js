import path from 'node:path';

import { create_static_module, create_dynamic_module } from '../../../core/env.js';
import { dedent } from '../../../core/sync/utils.js';
import { s } from '../../../utils/misc.js';
import { get_environment_name } from '../environment.js';
import {
	env_dynamic_private,
	env_dynamic_public,
	env_static_private,
	env_static_public,
	service_worker,
	sveltekit_environment,
	sveltekit_server
} from '../module_ids.js';
import { normalize_id } from '../utils.js';

/**
 * @param {{
 *  get_env: () => { public: Record<string, string>; private: Record<string, string> } | undefined;
 *  get_is_build: () => boolean;
 *  kit: import('types').ValidatedKitConfig;
 *  normalized_cwd: string;
 *  normalized_lib: string;
 *  parsed_service_worker: path.ParsedPath;
 *  runtime_directory: string;
 *  svelte_config: import('types').ValidatedConfig;
 *  version_hash: string;
 *  get_vite_config_env: () => import('vite').ConfigEnv | undefined;
 *  create_service_worker_module: (config: import('types').ValidatedConfig) => string;
 * }} options
 */
export function create_virtual_modules_plugin({
	get_env,
	get_is_build,
	kit,
	normalized_cwd,
	normalized_lib,
	parsed_service_worker,
	runtime_directory,
	svelte_config,
	version_hash,
	get_vite_config_env,
	create_service_worker_module
}) {
	/** @type {import('vite').Plugin} */
	const plugin = {
		name: 'vite-plugin-sveltekit-virtual-modules',

		/**
		 * @param {string} id
		 * @param {string | undefined} importer
		 */
		resolveId(id, importer) {
			if (id === '__sveltekit/manifest') {
				return `${kit.outDir}/generated/client-optimized/app.js`;
			}

			// If importing from a service-worker, only allow $service-worker & $env/static/public, but none of the other virtual modules.
			// This check won't catch transitive imports, but it will warn when the import comes from a service-worker directly.
			// Transitive imports will be caught during the build.
			// TODO move this logic to plugin_guard
			if (importer) {
				const parsed_importer = path.parse(importer);

				const importer_is_service_worker =
					parsed_importer.dir === parsed_service_worker.dir &&
					parsed_importer.name === parsed_service_worker.name;

				if (importer_is_service_worker && id !== '$service-worker' && id !== '$env/static/public') {
					throw new Error(
						`Cannot import ${normalize_id(
							id,
							normalized_lib,
							normalized_cwd
						)} into service-worker code. Only the modules $service-worker and $env/static/public are available in service workers.`
					);
				}
			}

			// treat $env/static/[public|private] as virtual
			if (id.startsWith('$env/') || id === '$service-worker') {
				// ids with :$ don't work with reverse proxies like nginx
				return `\0virtual:${id.substring(1)}`;
			}

			if (id === '__sveltekit/remote') {
				return `${runtime_directory}/client/remote-functions/index.js`;
			}

			if (id.startsWith('__sveltekit/')) {
				return `\0virtual:${id}`;
			}
		},

		/**
		 * @param {string} id
		 * @param {import('../environment.js').ViteEnvironmentOptionsLike | undefined} options
		 */
		load(id, options) {
			const env = get_env();
			const is_build = get_is_build();
			const vite_config_env = get_vite_config_env();

			if (!env || !vite_config_env) {
				throw new Error('SvelteKit Vite environment is not initialized yet');
			}

			const browser = get_environment_name(options) === 'client';

			const global = is_build
				? `globalThis.__sveltekit_${version_hash}`
				: 'globalThis.__sveltekit_dev';

			switch (id) {
				case env_static_private:
					return create_static_module('$env/static/private', env.private);

				case env_static_public:
					return create_static_module('$env/static/public', env.public);

				case env_dynamic_private:
					return create_dynamic_module(
						'private',
						vite_config_env.command === 'serve' ? env.private : undefined
					);

				case env_dynamic_public:
					// populate `$env/dynamic/public` from `window`
					if (browser) {
						return `export const env = ${global}.env;`;
					}

					return create_dynamic_module(
						'public',
						vite_config_env.command === 'serve' ? env.public : undefined
					);

				case service_worker:
					return create_service_worker_module(svelte_config);

				case sveltekit_environment: {
					const { version } = svelte_config.kit;

					return dedent`
						export const version = ${s(version.name)};
						export let building = false;
						export let prerendering = false;

						export function set_building() {
							building = true;
						}

						export function set_prerendering() {
							prerendering = true;
						}
					`;
				}

				case sveltekit_server: {
					return dedent`
						export let read_implementation = null;

						export let manifest = null;

						export function set_read_implementation(fn) {
							read_implementation = fn;
						}

						export function set_manifest(_) {
							manifest = _;
						}
					`;
				}
			}
		}
	};

	return plugin;
}
