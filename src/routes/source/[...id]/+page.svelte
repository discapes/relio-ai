<script lang="ts">
	import { sourceHref } from '$lib/presentation/navigation';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import NameText from '$lib/components/NameText.svelte';
	import type { Source, Person } from '$lib/types';
	let {
		data
	}: {
		data: {
			source: Source;
			returnTo: { href: string; label: string };
			people: Person[];
			neighbours: Source[];
			workspaceId: string;
			epoch: number;
			personaId: string;
			level: number;
		};
	} = $props();
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

<svelte:head><title>{data.source.title} · Relio</title></svelte:head>
<main class="source-page">
	<a class="back-link" href={data.returnTo.href}>← {data.returnTo.label}</a>
	<div class="source-heading">
		<span class="eyebrow">Source receipt</span>
		<h1><NameText text={data.source.title} people={data.people} /></h1>
		<div class="pills">
			<span class="badge">{data.source.type}</span><span class="badge">L{data.source.level}</span
			>{#if data.source.generated}<span class="badge">Agent-generated</span>{/if}
		</div>
	</div>
	<dl class="source-meta">
		<div>
			<dt>Author / speaker</dt>
			<dd><NameText text={data.source.author || 'Unattributed'} people={data.people} /></dd>
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
			<p><strong>From:</strong> <NameText text={data.source.email.from} people={data.people} /></p>
			<p>
				<strong>To:</strong>
				<NameText text={data.source.email.to.join(', ')} people={data.people} />
			</p>
			<p>
				<strong>Cc:</strong>
				<NameText text={data.source.email.cc.join(', ') || '—'} people={data.people} />
			</p>
		</div>{/if}
	<article class="source-text"><NameText text={data.source.text} people={data.people} /></article>
	{#if data.neighbours.length}<section class="source-neighbours">
			<h2>Surrounding conversation</h2>
			{#each data.neighbours as neighbour}<article>
					<strong><NameText text={neighbour.author} people={data.people} /></strong> ·
					<a
						href={sourceHref(
							neighbour.id,
							data.returnTo.href.split('#')[0],
							decodeURIComponent(data.returnTo.href.split('#')[1] || '')
						)}>{neighbour.position} · {neighbour.date}</a
					>
					<p><NameText text={neighbour.text} people={data.people} /></p>
				</article>{/each}
		</section>{/if}
	<p class="source-note">
		This is the application's current source record. Local dates from the archive retain their
		original timezone ambiguity. Source IDs and positions connect this passage to its document.
	</p>
</main>
