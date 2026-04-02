<script>
	import { get_rows, multiply_by_ten } from './data.remote.js';

	const numbers = get_rows();
	let done = $state(false);

	async function refresh_twice() {
		done = false;
		await numbers.refresh();
		await numbers.refresh();
		done = true;
	}
</script>

<h1>Nested refresh loop regression</h1>
<button id="double-refresh" onclick={refresh_twice}>double refresh</button>
<p id="done">{done ? 'true' : 'false'}</p>
<p id="outer-length">{(await numbers).length}</p>

{#each await numbers as number, index (index)}
	<p id="row-{index}">
		{number} -> <span id="inner-{index}">{await multiply_by_ten(number)}</span>
	</p>
{/each}
