import { query } from '$app/server';

let seed = 0;

export const get_data = query(() => {
	seed += 1;
	return [seed, seed + 1, seed + 2];
});

export const multiply_by_10 = query('unchecked', async (value) => {
	// Make nested queries complete in a later task, so two back-to-back refresh calls overlap.
	// Force overlap between nested item queries and parent query refreshes.
	await new Promise((resolve) => setTimeout(resolve, 10));
	return value * 10;
});
