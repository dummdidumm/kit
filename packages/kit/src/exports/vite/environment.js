/**
 * @typedef {{
 *   ssr?: boolean;
 *   environment?: string | { name?: string };
 * }} ViteEnvironmentOptionsLike
 */

/**
 * Normalizes Vite's environment information across old and new APIs.
 * For Vite < 6 this falls back to the legacy `ssr` boolean.
 *
 * @param {ViteEnvironmentOptionsLike | undefined} options
 */
export function get_environment_name(options) {
	const environment = options?.environment;

	if (typeof environment === 'string') {
		return environment;
	}

	if (environment && typeof environment === 'object' && typeof environment.name === 'string') {
		return environment.name;
	}

	return options?.ssr ? 'ssr' : 'client';
}

/**
 * @param {ViteEnvironmentOptionsLike | undefined} options
 */
export function is_server_environment(options) {
	return get_environment_name(options) !== 'client';
}

/**
 * @param {import('vite').ResolvedConfig | import('vite').UserConfig} config
 */
export function is_ssr_build(config) {
	return !!config.build?.ssr;
}

/**
 * Gets an environment-aware module graph with fallback to legacy APIs.
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {string} [environment]
 */
export function get_environment_module_graph(vite, environment = 'ssr') {
	if (vite.environments) {
		return (
			vite.environments[environment]?.moduleGraph ||
			vite.environments.ssr?.moduleGraph ||
			vite.environments.client?.moduleGraph ||
			vite.moduleGraph
		);
	}

	return vite.moduleGraph;
}

/**
 * Gets a module from the requested environment graph.
 * The legacy Vite API requires passing `ssr=true` to select the server graph.
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {string} url
 * @param {string} [environment]
 */
export function get_module_by_url(vite, url, environment = 'ssr') {
	if (vite.environments) {
		return get_environment_module_graph(vite, environment)?.getModuleByUrl(url);
	}

	return vite.moduleGraph.getModuleByUrl(url, environment !== 'client');
}
