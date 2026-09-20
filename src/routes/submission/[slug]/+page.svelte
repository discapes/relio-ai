<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	let { data } = $props();
	const blocks = $derived(data.document.text.split(/\n\s*\n/));
	function inline(text: string) {
		return text
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			.replace(/\*\*([^*]+)\*\*/g, '$1')
			.replace(/`([^`]+)`/g, '$1');
	}
	function sourceTokens(text: string) {
		return inline(text)
			.split(
				/((?:emails|transcripts|reports)\/[a-zA-Z0-9_-]+#(?:message|utterance|update)-[0-9]+)/g
			)
			.map((text, index) => ({
				text,
				href: index % 2 ? '/source/' + encodeURIComponent(text) : ''
			}));
	}
	onMount(() => {
		const timer = setInterval(() => {
			void fetch('/state')
				.then((r) => r.json())
				.then((state) => {
					if (
						(['workspaceId', 'epoch', 'personaId', 'level'] as const).some(
							(key) => state[key] !== data.context[key]
						)
					)
						void invalidateAll();
				})
				.catch(() => {});
		}, 3000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head><title>{data.document.title} · Receipt submission</title></svelte:head>
<main class="submission-page">
	<a href="/?view=about">← How it works</a>
	<header>
		<p class="eyebrow">Submission documents · original archive</p>
		<h1>{data.document.title}</h1>
		<p>
			Reviewed reference answers and raw model evaluations are separate documents. These materials
			use the original archive and require an Acme L3 workspace with no erasure. Downloaded copies
			have a separate retention boundary.
		</p>
		<a class="button secondary" href={`/submission/${data.document.slug}/download`}
			>Download Markdown</a
		>
	</header>
	<nav aria-label="Submission documents">
		{#each data.documents as document}<a
				href={`/submission/${document.slug}`}
				aria-current={document.slug === data.document.slug ? 'page' : undefined}>{document.title}</a
			>{/each}
	</nav>
	<article>
		{#each blocks as block}
			{#if /^#{1,3} /.test(block)}<h2>{inline(block.replace(/^#{1,3} /, ''))}</h2>
			{:else if block.startsWith('|')}<div class="document-table">
					<table>
						<tbody>
							{#each block
								.split('\n')
								.filter((line: string) => !/^\|[\s:|-]+\|$/.test(line)) as row}<tr
									>{#each row.split('|').slice(1, -1) as cell}<td>{inline(cell.trim())}</td
										>{/each}</tr
								>{/each}
						</tbody>
					</table>
				</div>
			{:else if block.startsWith('- ')}<ul>
					{#each block.split('\n') as line}<li>{inline(line.replace(/^- /, ''))}</li>{/each}
				</ul>
			{:else}<p>
					{#each sourceTokens(block) as token}{#if token.href}<a href={token.href}>{token.text}</a
							>{:else}{token.text}{/if}{/each}
				</p>{/if}
		{/each}
	</article>
</main>

<style>
	.submission-page {
		max-width: 1060px;
		margin: 40px auto;
		padding: 0 24px 64px;
	}
	header {
		display: block;
		height: auto;
		position: static;
		padding: 0;
		border: 0;
		background: transparent;
		margin: 28px 0;
	}
	header p {
		max-width: 840px;
		line-height: 1.7;
	}
	nav {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 10px;
		margin: 24px 0;
	}
	nav a {
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 9px 13px;
	}
	nav a[aria-current] {
		background: #eaf1e3;
	}
	article {
		overflow-wrap: anywhere;
		background: white;
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 32px;
		font-size: 16px;
		line-height: 1.8;
	}
	article h2 {
		margin: 28px 0 14px;
		font-size: 22px;
	}
	article h2:first-child {
		margin-top: 0;
	}
	article p {
		white-space: pre-wrap;
	}
	li {
		margin-bottom: 8px;
	}
	.document-table {
		overflow-x: auto;
	}
	table {
		border-collapse: collapse;
		min-width: 650px;
	}
	td {
		vertical-align: top;
		border: 1px solid var(--border);
		padding: 10px 14px;
	}
	tr:first-child {
		font-weight: 700;
		background: #f5f8f1;
	}
	@media (max-width: 600px) {
		.submission-page {
			padding: 0 16px 40px;
		}
		article {
			padding: 20px;
		}
		h1 {
			font-size: 30px;
		}
	}
</style>
