import { describe, expect, it, vi } from 'vitest';

import {
	get_environment_module_graph,
	get_environment_name,
	get_module_by_url,
	is_server_environment,
	is_ssr_build
} from './environment.js';

describe('vite environment helpers', () => {
	it('normalizes environment names across legacy and new options', () => {
		expect(get_environment_name(undefined)).toBe('client');
		expect(get_environment_name({ ssr: false })).toBe('client');
		expect(get_environment_name({ ssr: true })).toBe('ssr');
		expect(get_environment_name({ environment: 'edge' })).toBe('edge');
		expect(get_environment_name({ environment: { name: 'worker' } })).toBe('worker');
	});

	it('detects whether an environment is server-like', () => {
		expect(is_server_environment(undefined)).toBe(false);
		expect(is_server_environment({ ssr: false })).toBe(false);
		expect(is_server_environment({ ssr: true })).toBe(true);
		expect(is_server_environment({ environment: 'edge' })).toBe(true);
	});

	it('detects ssr build from vite config', () => {
		expect(is_ssr_build({ build: { ssr: true } })).toBe(true);
		expect(is_ssr_build({ build: { ssr: false } })).toBe(false);
		expect(is_ssr_build({})).toBe(false);
	});

	it('selects an environment-aware module graph when available', () => {
		const ssr_graph = {};
		const client_graph = {};
		const legacy_graph = {};
		const vite = /** @type {import('vite').ViteDevServer} */ (
			/** @type {any} */ ({
				environments: {
					ssr: { moduleGraph: ssr_graph },
					client: { moduleGraph: client_graph }
				},
				moduleGraph: legacy_graph
			})
		);

		expect(get_environment_module_graph(vite, 'ssr')).toBe(ssr_graph);
		expect(get_environment_module_graph(vite, 'client')).toBe(client_graph);
		expect(get_environment_module_graph(vite, 'edge')).toBe(ssr_graph);
	});

	it('falls back to legacy module graph APIs when needed', () => {
		const getModuleByUrl = vi.fn();
		const vite = /** @type {import('vite').ViteDevServer} */ (
			/** @type {any} */ ({
				moduleGraph: { getModuleByUrl }
			})
		);

		get_module_by_url(vite, '/x', 'ssr');
		expect(getModuleByUrl).toHaveBeenCalledWith('/x', true);

		get_module_by_url(vite, '/y', 'client');
		expect(getModuleByUrl).toHaveBeenCalledWith('/y', false);
	});
});
