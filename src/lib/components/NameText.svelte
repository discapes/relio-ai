<script lang="ts">
	import type { Person } from '$lib/types';
	import { nameParts } from '$lib/people';
	let { text, people = [] }: { text: string; people?: Person[] } = $props();
	const parts = $derived(nameParts(text, people));
</script>

{#each parts as part}{#if part.personId}<a
			class="person-name"
			href={`/?view=people&person=${encodeURIComponent(part.personId)}`}
			title={`View ${part.name} in People`}>{part.text}</a
		>{:else}{part.text}{/if}{/each}

<style>
	.person-name {
		color: var(--action-hover);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--action) 40%, transparent);
		text-underline-offset: 3px;
		border-radius: 2px;
	}
	.person-name:hover {
		background: var(--surface-selected);
		text-decoration-color: currentColor;
	}
	.person-name:focus-visible {
		outline: 2px solid var(--action);
		outline-offset: 2px;
	}
</style>
