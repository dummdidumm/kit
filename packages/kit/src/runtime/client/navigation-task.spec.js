import { describe, expect, it } from 'vitest';

import { create_navigation_task_runtime } from './navigation-task.js';

describe('navigation task runtime', () => {
	it('starts with a token and can create newer tokens', () => {
		const runtime = create_navigation_task_runtime();
		const first = runtime.current();
		expect(runtime.is_current(first)).toBe(true);

		const second = runtime.start();
		expect(second).not.toBe(first);
		expect(runtime.is_current(first)).toBe(false);
		expect(runtime.is_current(second)).toBe(true);
	});

	it('can restore a previous token', () => {
		const runtime = create_navigation_task_runtime();
		const previous = runtime.current();
		const active = runtime.start();

		expect(runtime.is_current(active)).toBe(true);
		runtime.set(previous);
		expect(runtime.is_current(previous)).toBe(true);
		expect(runtime.is_current(active)).toBe(false);
	});
});
