import { query } from '$app/server';

let seed = 0;
let multiply_request_count = 0;

export const get_data = query(() => {
	seed += 1;
	return [seed, seed + 1, seed + 2];
});

export const multiply_by_10 = query(async (value) => {
	multiply_request_count += 1;

	// Force overlap between nested item queries and parent query refreshes.
	await new Promise((resolve) => setTimeout(resolve, 1));
	return value * 10;
});

export const get_multiply_request_count = query(() => multiply_request_count);
