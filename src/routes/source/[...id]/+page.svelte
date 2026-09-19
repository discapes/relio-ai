<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import type { Source } from '$lib/types';
	let { data }: { data: { source: Source; neighbours:Source[]; workspaceId:string; epoch: number; personaId: string; level: number } } =
		$props();
	onMount(() => {
		const timer = setInterval(() => {
			void fetch('/state')
				.then((r) => r.json())
				.then((state) => {
					if (
						state.workspaceId !== data.workspaceId ||
 state.epoch !== data.epoch ||
						state.personaId !== data.personaId ||
						state.level !== data.level
					)
						void invalidateAll();
				})
				.catch(() => {});
		}, 4500);
		return () => clearInterval(timer);
	});
</script>

<svelte:head><title>{data.source.title} · Receipt</title></svelte:head>
<main class="source-page">
	<a class="back-link" href="/?view=memory">← Project memory</a>
	<div class="source-heading">
		<span class="eyebrow">Source receipt</span>
		<h1>{data.source.title}</h1>
		<div class="pills">
			<span class="badge">{data.source.type}</span><span class="badge">L{data.source.level}</span
			>{#if data.source.generated}<span class="badge">Agent-generated</span>{/if}
		</div>
	</div>
	<dl class="source-meta">
		<div>
			<dt>Author / speaker</dt>
			<dd>{data.source.author || 'Unattributed'}</dd>
		</div>
		<div>
			<dt>Recorded date</dt>
			<dd>{data.source.date || 'Unspecified'}</dd>
		</div>
		<div>
			<dt>Position</dt>
			<dd>{data.source.position}</dd>
		</div>
		<div>
			<dt>Document</dt>
			<dd>{data.source.documentId}</dd>
		</div>
	</dl>
	{#if data.source.email}<div class="source-mail">
			<p><strong>From:</strong> {data.source.email.from}</p>
			<p><strong>To:</strong> {data.source.email.to.join(', ')}</p>
			<p><strong>Cc:</strong> {data.source.email.cc.join(', ') || '—'}</p>
		</div>{/if}
	<article class="source-text">{data.source.text}</article>
	{#if data.neighbours.length}<section class="source-neighbours"><h2>Surrounding conversation</h2>{#each data.neighbours as neighbour}<article><a href={`/source/${encodeURIComponent(neighbour.id)}`}><strong>{neighbour.author}</strong> · {neighbour.position} · {neighbour.date}</a><p>{neighbour.text}</p></article>{/each}</section>{/if}
 <p class="source-note">
		This is the application's current source record. Local dates from the archive retain their
		original timezone ambiguity. Source IDs and positions connect this passage to its document.
	</p>
</main>
