<script lang="ts">
	import { getData, multiplyBy10 } from './foo.remote.ts';

	async function test() {
		await getData().refresh();
		await getData().refresh();
	}
</script>

<button onclick={test}>Refresh</button>
<ul>
	{#each await getData() as d}
		<li>Testcontent: {d}, x10: {await multiplyBy10(d)}</li>
	{/each}
</ul>
