<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		description,
		children,
		tone = 'default'
	}: {
		title: string;
		description?: string;
		children: Snippet;
		tone?: 'default' | 'sage';
	} = $props();
</script>

<section class:sage={tone === 'sage'} class="card">
	<div class="card-heading">
		<h2>{title}</h2>
		{#if description}<p>{description}</p>{/if}
	</div>
	<div class="card-body">{@render children()}</div>
</section>
