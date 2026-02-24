import { DEV } from 'esm-env';

import { disable_search, make_trackable } from '../../../utils/url.js';
import { validate_depends } from '../../shared.js';

/**
 * Creates dependency tracking and wrapped event accessors for server load functions.
 *
 * @param {{
 *  event: import('@sveltejs/kit').RequestEvent;
 *  parent: () => Promise<Record<string, any>>;
 *  prerendering: boolean;
 *  node_id: string | undefined;
 }} opts
 */
export function create_server_load_tracking({ event, parent, prerendering, node_id }) {
	let is_tracking = true;
	let done = false;

	const id = node_id || 'missing route ID';

	const uses = {
		dependencies: new Set(),
		params: new Set(),
		parent: false,
		route: false,
		url: false,
		search_params: new Set()
	};

	const url = make_trackable(
		event.url,
		() => {
			if (DEV && done && !uses.url) {
				console.warn(
					`${id}: Accessing URL properties in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the URL changes`
				);
			}

			if (is_tracking) {
				uses.url = true;
			}
		},
		(param) => {
			if (DEV && done && !uses.search_params.has(param)) {
				console.warn(
					`${id}: Accessing URL properties in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the URL changes`
				);
			}

			if (is_tracking) {
				uses.search_params.add(param);
			}
		}
	);

	if (prerendering) {
		disable_search(url);
	}

	return {
		uses,
		url,
		/**
		 * @param {URL | RequestInfo} info
		 * @param {RequestInit} [init]
		 */
		fetch: (info, init) => {
			const url = new URL(info instanceof Request ? info.url : info, event.url);

			if (DEV && done && !uses.dependencies.has(url.href)) {
				console.warn(
					`${id}: Calling \`event.fetch(...)\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the dependency is invalidated`
				);
			}

			// Note: server fetches are not added to uses.depends due to security concerns
			return event.fetch(info, init);
		},
		/** @param {string[]} deps */
		depends: (...deps) => {
			for (const dep of deps) {
				const { href } = new URL(dep, event.url);

				if (DEV) {
					validate_depends(id, dep);

					if (done && !uses.dependencies.has(href)) {
						console.warn(
							`${id}: Calling \`depends(...)\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the dependency is invalidated`
						);
					}
				}

				uses.dependencies.add(href);
			}
		},
		params: new Proxy(event.params, {
			get: (target, key) => {
				if (DEV && done && typeof key === 'string' && !uses.params.has(key)) {
					console.warn(
						`${id}: Accessing \`params.${String(
							key
						)}\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the param changes`
					);
				}

				if (is_tracking) {
					uses.params.add(key);
				}
				return target[/** @type {string} */ (key)];
			}
		}),
		parent: async () => {
			if (DEV && done && !uses.parent) {
				console.warn(
					`${id}: Calling \`parent(...)\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when parent data changes`
				);
			}

			if (is_tracking) {
				uses.parent = true;
			}
			return parent();
		},
		route: new Proxy(event.route, {
			get: (target, key) => {
				if (DEV && done && typeof key === 'string' && !uses.route) {
					console.warn(
						`${id}: Accessing \`route.${String(
							key
						)}\` in a promise handler after \`load(...)\` has returned will not cause the function to re-run when the route changes`
					);
				}

				if (is_tracking) {
					uses.route = true;
				}
				return target[/** @type {'id'} */ (key)];
			}
		}),
		/**
		 * @template T
		 * @param {() => T} fn
		 */
		untrack(fn) {
			is_tracking = false;
			try {
				return fn();
			} finally {
				is_tracking = true;
			}
		},
		mark_done() {
			done = true;
		}
	};
}
