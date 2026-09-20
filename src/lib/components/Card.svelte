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
		tone?: 'default' | 'tinted';
	} = $props();
</script>

<section class:tinted={tone === 'tinted'} class="card">
	<div class="card-heading">
		<h2>{title}</h2>
		{#if description}<p>{description}</p>{/if}
	</div>
	<div class="card-body">{@render children()}</div>
</section>
