import { describe, expect, it } from 'vitest';

import {
	create_ssr_props,
	resolve_render_paths,
	validate_prerendering_csp
} from './render_pipeline.js';

describe('render pipeline helpers', () => {
	it('validates nonce CSP constraints for prerendering', () => {
		expect(() =>
			validate_prerendering_csp(
				/** @type {import('types').SSRState} */ ({ prerendering: {} }),
				/** @type {import('types').SSROptions} */ ({
					csp: { mode: 'nonce' }
				})
			)
		).toThrowError('Cannot use prerendering if config.kit.csp.mode === "nonce"');
	});

	it('derives relative base/asset paths when enabled', () => {
		const result = resolve_render_paths({
			event: /** @type {import('@sveltejs/kit').RequestEvent} */ ({
				url: new URL('https://example.com/base/a/b')
			}),
			state: /** @type {import('types').SSRState} */ ({}),
			options: /** @type {import('types').SSROptions} */ ({ hash_routing: false }),
			base: '/base',
			assets: '',
			relative: true
		});

		expect(result.base).toBe('..');
		expect(result.assets).toBe('..');
		expect(result.base_expression).toContain('new URL("..", location)');
	});

	it('creates SSR props with merged layout/page data', async () => {
		const props = await create_ssr_props({
			branch: /** @type {any} */ ([
				{
					data: { layout: true, shared: 1 },
					node: {
						component: async () => ({ default: { render: () => ({}) } })
					}
				},
				{
					data: { page: true, shared: 2 },
					node: {
						component: async () => ({ default: { render: () => ({}) } })
					}
				}
			]),
			event: /** @type {any} */ ({
				params: { id: '123' },
				route: { id: '/[id]' },
				url: new URL('https://example.com/base/123')
			}),
			status: 200,
			error: null,
			form_value: null,
			updated: /** @type {any} */ ({ check: () => false })
		});

		expect(props.page.data).toEqual({ layout: true, shared: 2, page: true });
		expect(props.page.route.id).toBe('/[id]');
		expect(props.data_0).toEqual({ layout: true, shared: 1 });
		expect(props.data_1).toEqual({ layout: true, shared: 2, page: true });
	});
});
