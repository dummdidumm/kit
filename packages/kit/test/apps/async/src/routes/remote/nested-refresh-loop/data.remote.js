import { query } from '$app/server';

let request_count = 0;

export const get_rows = query(() => {
	request_count += 1;
	return [1, 2, 3].map((id) => ({ id, value: id }));
});

export const get_times_ten = query.batch('unchecked', (ids) => {
	request_count += 1;
	return (id) => id * 10;
});

export const get_request_count = query(() => request_count);
