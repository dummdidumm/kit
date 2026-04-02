import { query } from '$app/server';

let request_count = 0;

export const get_rows = query(() => {
	request_count += 1;
	return [1, 2, 3].map(() => Math.floor(Math.random() * 10));
});

export const multiply_by_ten = query.batch('unchecked', (numbers) => {
	request_count += 1;
	return (number) => number * 10;
});

export const get_request_count = query(() => request_count);
