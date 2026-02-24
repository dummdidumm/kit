import { writable } from 'svelte/store';

import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import { s } from '../../../utils/misc.js';

/**
 * @param {import('types').SSRState} state
 * @param {import('types').SSROptions} options
 */
export function validate_prerendering_csp(state, options) {
	if (!state.prerendering) return;

	if (options.csp.mode === 'nonce') {
		throw new Error('Cannot use prerendering if config.kit.csp.mode === "nonce"');
	}

	if (options.app_template_contains_nonce) {
		throw new Error('Cannot use prerendering if page template contains %sveltekit.nonce%');
	}
}

/**
 * @param {{
 *  event: import('@sveltejs/kit').RequestEvent;
 *  state: import('types').SSRState;
 *  options: import('types').SSROptions;
 *  base: string;
 *  assets: string;
 *  relative: boolean;
 * }} opts
 */
export function resolve_render_paths({ event, state, options, base, assets, relative }) {
	/**
	 * An expression that will evaluate in the client to determine the resolved base path.
	 * We use a relative path when possible to support IPFS, the internet archive, etc.
	 */
	let base_expression = s(base);

	// if appropriate, use relative paths for greater portability
	if (relative) {
		if (!state.prerendering?.fallback) {
			const segments = event.url.pathname.slice(base.length).split('/').slice(2);

			base = segments.map(() => '..').join('/') || '.';

			// resolve e.g. '../..' against current location, then remove trailing slash
			base_expression = `new URL(${s(base)}, location).pathname.slice(0, -1)`;

			if (!assets || (assets[0] === '/' && assets !== SVELTE_KIT_ASSETS)) {
				assets = base;
			}
		} else if (options.hash_routing) {
			// we have to assume that we're in the right place
			base_expression = "new URL('.', location).pathname.slice(0, -1)";
		}
	}

	return { base, assets, base_expression };
}

/**
 * @param {{
 *  branch: Array<import('./types.js').Loaded>;
 *  event: import('@sveltejs/kit').RequestEvent;
 *  status: number;
 *  error: App.Error | null;
 *  form_value: any;
 *  updated: import('svelte/store').Readable<boolean> & { check: () => boolean };
 * }} opts
 */
export async function create_ssr_props({ branch, event, status, error, form_value, updated }) {
	/** @type {Record<string, any>} */
	const props = {
		stores: {
			page: writable(null),
			navigating: writable(null),
			updated
		},
		constructors: await Promise.all(
			branch.map(({ node }) => {
				if (!node.component) {
					// Can only be the leaf, layouts have a fallback component generated
					throw new Error(`Missing +page.svelte component for route ${event.route.id}`);
				}
				return node.component();
			})
		),
		form: form_value
	};

	let data = {};

	// props_n (instead of props[n]) makes it easy to avoid unnecessary updates for layout components
	for (let i = 0; i < branch.length; i += 1) {
		data = { ...data, ...branch[i].data };
		props[`data_${i}`] = data;
	}

	props.page = {
		error,
		params: /** @type {Record<string, any>} */ (event.params),
		route: event.route,
		status,
		url: event.url,
		data,
		form: form_value,
		state: {}
	};

	return props;
}
