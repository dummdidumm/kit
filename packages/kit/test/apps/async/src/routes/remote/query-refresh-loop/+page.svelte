<script>
	import { get_data, multiply_by_10 } from './data.remote.js';

	const data = get_data();

	async function refresh_twice() {
		await data.refresh();
		await data.refresh();
	}
</script>

<button id="refresh-twice" onclick={refresh_twice}>Refresh</button>

<p id="query-length">{(await data).length}</p>

<ul>
	{#each await data as value}
		<li>Testcontent: {value}, x10: {await multiply_by_10(value)}</li>
	{/each}
</ul>
