<script lang="ts">
	import type { Claim, Source } from '$lib/types';
	import Badge from './Badge.svelte';
	let { claims, sources }: { claims: Claim[]; sources: Source[] } = $props();
	let selected = $state('');
	let visibleCount = $state(24);
	const visible = $derived(claims.slice(0, visibleCount));
	const active = $derived(claims.find((c) => c.id === selected) ?? visible[0]);
	const linked = $derived(
		active ? sources.filter((s) => active.sourceIds.includes(s.id)).slice(0, 6) : []
	);
	const documents = $derived(new Set(linked.map((s) => s.documentId)));
	const related = $derived(
		active
			? claims
					.filter(
						(c) =>
							c.id !== active.id &&
							c.sourceIds.some((id) =>
								sources.some((s) => s.id === id && documents.has(s.documentId))
							)
					)
					.slice(0, 3)
			: []
	);
	function point(i: number, n: number) {
		const a = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
		return { x: 360 + Math.cos(a) * 235, y: 235 + Math.sin(a) * 165 };
	}
</script>

<div class="graph-wrap">
	<div class="graph-controls" aria-label="Select a graph claim">
		{#each visible as claim, i}<button
				class:chosen={active?.id === claim.id}
				onclick={() => (selected = claim.id)}
				title={claim.text}>{i + 1}. {claim.kind.replaceAll('_', ' ')}</button
			>{/each}
		{#if claims.length > visibleCount}<button onclick={() => (visibleCount += 24)}
				>Show more claims ({claims.length - visibleCount} remaining)</button
			>{/if}
	</div>
	<svg
		viewBox="0 0 720 470"
		role="group"
		aria-label="Selected claim linked to its supporting source passages and authors"
	>
		<defs
			><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"
				><circle cx="2" cy="2" r="1" fill="var(--border)" /></pattern
			></defs
		><rect width="720" height="470" fill="url(#dots)" />
		{#each linked as source, i}{@const p = point(i, linked.length)}<line
				x1="360"
				y1="235"
				x2={p.x}
				y2={p.y}
				stroke="var(--action)"
				stroke-width="1.5"
			/><text
				x={(360 + p.x) / 2}
				y={(235 + p.y) / 2 - 7}
				text-anchor="middle"
				fill="var(--muted)"
				font-size="11">supported by</text
			>{/each}
		<circle cx="360" cy="235" r="54" fill="var(--text)" /><text
			x="360"
			y="230"
			text-anchor="middle"
			fill="var(--on-action)"
			font-size="15"
			font-weight="700">{active?.kind.replaceAll('_', ' ') || 'Acme'}</text
		><text x="360" y="253" text-anchor="middle" fill="var(--surface-selected)" font-size="12"
			>{active?.status || 'project memory'}</text
		>
		{#each linked as source, i}{@const p = point(i, linked.length)}<a
				href={`/source/${encodeURIComponent(source.id)}`}
				aria-label={`Open supporting source ${i + 1}: ${source.title}, ${source.author}`}
				><circle
					cx={p.x}
					cy={p.y}
					r="24"
					fill="var(--surface-selected)"
					stroke="var(--action)"
					stroke-width="2"
				/><text
					x={p.x}
					y={p.y + 5}
					text-anchor="middle"
					fill="var(--text)"
					font-size="14"
					font-weight="700">{i + 1}</text
				><text x={p.x} y={p.y + 44} text-anchor="middle" fill="var(--text)" font-size="12"
					>{source.author.slice(0, 30) || 'Unattributed'}</text
				><text x={p.x} y={p.y + 61} text-anchor="middle" fill="var(--muted)" font-size="11"
					>{source.date.slice(0, 10)} · {source.type}</text
				></a
			>{/each}
	</svg>
	<div class="graph-legend">
		<span><i></i>Selected claim</span><span><i></i>Source passage and author</span><span
			>Select a source to read its evidence</span
		>
	</div>
	{#if active}<div class="graph-detail">
			<Badge status={active.status}>{active.status}</Badge>
			<p>{active.text}</p>
			<strong>Supporting sources</strong>{#each linked as source, i}<a
					href={`/source/${encodeURIComponent(source.id)}`}
					>{i + 1}. {source.title}<small>{source.date} · {source.author} · {source.position}</small
					></a
				>{/each}{#if !linked.length}<small>Supporting sources are unavailable in this view.</small
				>{/if}{#if related.length}<strong>Claims from the same discussion</strong>
				<div class="related-claims">
					{#each related as claim}<button onclick={() => (selected = claim.id)}
							><span class="badge">{claim.kind.replaceAll('_', ' ')}</span>{claim.text}</button
						>{/each}
				</div>
				<small
					>These claims share a source document. Their relationship is shown for inspection.</small
				>{/if}
		</div>{:else}<p class="empty">
			Claims appear here after project memory has been prepared.
		</p>{/if}
</div>
