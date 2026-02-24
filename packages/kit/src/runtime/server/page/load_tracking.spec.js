import { describe, expect, it } from 'vitest';

import { create_server_load_tracking } from './load_tracking.js';

describe('server load tracking', () => {
	it('tracks dependencies, params, route and parent access', async () => {
		const tracking = create_server_load_tracking({
			event: /** @type {any} */ ({
				url: new URL('https://example.com/a?foo=1'),
				params: { slug: 'hello' },
				route: { id: '/[slug]' },
				fetch: async () => new Response('ok')
			}),
			parent: async () => ({ ok: true }),
			prerendering: false,
			node_id: '/[slug]/+page.server.js'
		});

		expect(tracking.uses.dependencies.size).toBe(0);
		expect(tracking.uses.params.size).toBe(0);

		tracking.depends('app:posts');
		expect(Array.from(tracking.uses.dependencies)).toContain('app:posts');

		expect(tracking.params.slug).toBe('hello');
		expect(tracking.uses.params.has('slug')).toBe(true);

		expect(tracking.route.id).toBe('/[slug]');
		expect(tracking.uses.route).toBe(true);

		await tracking.parent();
		expect(tracking.uses.parent).toBe(true);

		// access URL and search params through the tracked URL wrapper
		void tracking.url.pathname;
		void tracking.url.searchParams.get('foo');
		expect(tracking.uses.url).toBe(true);
		expect(tracking.uses.search_params.has('foo')).toBe(true);
	});

	it('supports untracked reads', () => {
		const tracking = create_server_load_tracking({
			event: /** @type {any} */ ({
				url: new URL('https://example.com/a?foo=1'),
				params: { slug: 'hello' },
				route: { id: '/[slug]' },
				fetch: async () => new Response('ok')
			}),
			parent: async () => ({ ok: true }),
			prerendering: false,
			node_id: '/[slug]/+layout.server.js'
		});

		tracking.untrack(() => {
			void tracking.params.slug;
			void tracking.route.id;
			void tracking.url.pathname;
		});

		expect(tracking.uses.params.size).toBe(0);
		expect(tracking.uses.route).toBe(false);
		expect(tracking.uses.url).toBe(false);
	});
});
