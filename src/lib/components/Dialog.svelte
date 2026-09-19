<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';
	let {
		title,
		children,
		trigger = 'Open dialog'
	}: { title: string; children: Snippet; trigger?: string } = $props();
	let dialog: HTMLDialogElement;
	const id = $props.id();
</script>

<button class="button secondary" onclick={() => dialog.showModal()}>{trigger}</button>
<dialog bind:this={dialog} aria-labelledby={id}>
	<div class="dialog-heading">
		<h2 {id}>{title}</h2>
		<button class="icon-button" aria-label="Close dialog" onclick={() => dialog.close()}
			><X size={20} /></button
		>
	</div>
	{@render children()}
	<form method="dialog"><button class="button">Done</button></form>
</dialog>
