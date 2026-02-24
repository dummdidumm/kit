import { describe, expect, it } from 'vitest';

import { BINARY_FORM_CONTENT_TYPE, convert_formdata } from './core.js';

describe('forms core', () => {
	it('re-exports binary form content type', () => {
		expect(BINARY_FORM_CONTENT_TYPE).toBe('application/x-sveltekit-formdata');
	});

	it('converts FormData with nested keys', () => {
		const data = new FormData();
		data.set('user.name', 'Rich');
		data.set('n:user.age', '42');

		expect(convert_formdata(data)).toEqual({
			user: {
				name: 'Rich',
				age: 42
			}
		});
	});
});
