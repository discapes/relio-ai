<script lang="ts">
	import { ArrowUpRight, PanelsTopLeft, Type, Palette, Search } from '@lucide/svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	let query = $state('');
	let status = $state('All statuses');
	const rows = [
		{ name: 'Example one', description: 'A place for a short description', status: 'Ready' },
		{ name: 'Example two', description: 'A second item in the collection', status: 'Draft' },
		{ name: 'Example three', description: 'An item that needs another look', status: 'Review' }
	];
	const filtered = $derived(
		rows.filter(
			(row) =>
				row.name.toLowerCase().includes(query.toLowerCase()) &&
				(status === 'All statuses' || row.status === status)
		)
	);
</script>

<svelte:head
	><title>Overview · Workspace</title><meta
		name="description"
		content="A simple workspace foundation with reusable interface elements."
	/></svelte:head
>
<div class="page-heading">
	<div>
		<p class="eyebrow">YOUR STARTING POINT</p>
		<h1>A little structure.<br />Plenty of possibility.</h1>
		<p>The essentials for your next workspace, ready to make your own.</p>
	</div>
	<a class="button" href="/settings">Workspace settings <ArrowUpRight size={18} /></a>
</div>
<div class="stats-grid">
	<div class="stat">
		<PanelsTopLeft size={20} /><span>Layout</span><strong>Room to focus</strong><small
			>Clear navigation and flexible cards</small
		>
	</div>
	<div class="stat">
		<Type size={20} /><span>Typography</span><strong>A familiar rhythm</strong><small
			>Manrope headings, DM Sans body</small
		>
	</div>
	<div class="stat">
		<Palette size={20} /><span>Palette</span><strong>A softer green</strong><small
			>Forest accents and sage surfaces</small
		>
	</div>
</div>
<div class="content-grid">
	<Card title="Example collection" description="Sample content for exploring the interface.">
		<div class="filters">
			<label class="search"
				><Search size={18} /><span class="sr-only">Search examples</span><input
					bind:value={query}
					placeholder="Search examples"
				/></label
			><label
				><span class="sr-only">Filter by status</span><select bind:value={status}
					><option>All statuses</option><option>Ready</option><option>Draft</option><option
						>Review</option
					></select
				></label
			>
		</div>
		<div class="table-scroll">
			<table>
				<caption class="sr-only">Example collection</caption><thead
					><tr><th scope="col">Name</th><th scope="col">Status</th></tr></thead
				><tbody
					>{#each filtered as row}<tr
							><td><strong>{row.name}</strong><small>{row.description}</small></td><td
								><Badge
									tone={row.status === 'Ready'
										? 'success'
										: row.status === 'Review'
											? 'warning'
											: 'neutral'}>{row.status}</Badge
								></td
							></tr
						>{:else}<tr><td colspan="2" class="empty">No examples match your filters.</td></tr
						>{/each}</tbody
				>
			</table>
		</div>
		<p class="table-footer" aria-live="polite">{filtered.length} of {rows.length} examples</p>
	</Card>
	<Card title="Space for what comes next" tone="sage"
		><p>Start with the structure here, then shape it around the work that matters.</p>
		<div
			class="swatches"
			role="img"
			aria-label="Forest green, muted green, sage and pale amber palette"
		>
			<span style="background:#1c7258"></span><span style="background:#6f9c82"></span><span
				style="background:#e2ece2"
			></span><span style="background:#fff5dd"></span>
		</div>
		<Dialog title="A simple detail view" trigger="Preview dialog"
			><p>Use this space for more context, a short explanation, or a focused action.</p></Dialog
		></Card
	>
</div>
