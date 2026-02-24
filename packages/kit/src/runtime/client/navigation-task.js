/**
 * Manages cancellable navigation task tokens.
 * A navigation is considered active while its token matches the current token.
 */
export function create_navigation_task_runtime() {
	/** @type {{}} */
	let current = {};

	return {
		/**
		 * Creates a fresh token and marks it as current.
		 */
		start() {
			current = {};
			return current;
		},
		/**
		 * Marks the given token as current.
		 * @param {{}} token
		 */
		set(token) {
			current = token;
			return current;
		},
		/**
		 * @returns {{}}
		 */
		current() {
			return current;
		},
		/**
		 * @param {{}} token
		 */
		is_current(token) {
			return current === token;
		}
	};
}
