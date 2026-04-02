<script>
	import { get_rows, get_times_ten, get_request_count } from './data.remote.js';

	const rows = get_rows();
	let done = $state(false);

	async function refresh_twice() {
		done = false;
		await rows.refresh();
		await rows.refresh();
		done = true;
	}
</script>

<h1>Nested refresh loop regression</h1>
<button id="double-refresh" onclick={refresh_twice}>double refresh</button>
<p id="done">{done ? 'true' : 'false'}</p>
<p id="request-count">{await get_request_count()}</p>

{#each await rows as row, index (index)}
	<p id="row-{index}">
		{row.id} -> <span id="inner-{index}">{await get_times_ten(row.value)}</span>
	</p>
{/each}
